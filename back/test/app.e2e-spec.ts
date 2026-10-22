import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('API e2e (PostgreSQL real)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let dataSource: DataSource;
  let creatorId: string;

  const get = (path: string) => request(server).get(path);
  const post = (path: string) => request(server).post(path);
  const del = (path: string) => request(server).delete(path);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    // A real HTTP listener keeps concurrent supertest calls reliable.
    await app.listen(0);

    server = app.getHttpServer();
    dataSource = app.get(DataSource);

    await cleanDatabase();

    const creators = await get('/creators').expect(200);
    expect(Array.isArray(creators.body)).toBe(true);
    expect(creators.body.length).toBeGreaterThanOrEqual(2);
    creatorId = creators.body[0].id;
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  async function cleanDatabase(): Promise<void> {
    await dataSource.query('DELETE FROM followers');
    await dataSource.query('DELETE FROM users');
  }

  async function createUser(
    name = 'Usuario E2E',
  ): Promise<{ id: string; name: string }> {
    const response = await post('/users').send({ name }).expect(201);
    return response.body;
  }

  describe('POST /users', () => {
    it('cria usuário e responde 201 com id uuid e name', async () => {
      const response = await post('/users')
        .send({ name: 'Ana E2E' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.stringMatching(UUID_V4),
        name: 'Ana E2E',
      });
    });

    it('responde 400 para body inválido', async () => {
      await post('/users').send({}).expect(400);
      await post('/users').send({ name: '   ' }).expect(400);
      await post('/users').send({ name: 123 }).expect(400);
      await post('/users').send({ name: 'ok', extra: true }).expect(400);
    });
  });

  describe('GET /creators', () => {
    it('lista as criadoras', async () => {
      const response = await get('/creators').expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          { id: creatorId, name: expect.any(String) },
        ]),
      );
    });

    it('busca uma criadora existente', async () => {
      const response = await get(`/creators/${creatorId}`).expect(200);

      expect(response.body).toEqual({
        id: creatorId,
        name: expect.any(String),
      });
    });

    it('responde 404 para criadora inexistente', async () => {
      const response = await get(`/creators/${randomUUID()}`).expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('followers', () => {
    it('segue (201), seguir de novo (200) e não duplica o count', async () => {
      const user = await createUser();
      const path = `/creators/${creatorId}/followers`;

      const first = await post(path).send({ userId: user.id });
      expect(first.status).toBe(201);
      expect(first.body).toEqual({
        creatorId,
        userId: user.id,
        following: true,
      });

      const second = await post(path).send({ userId: user.id });
      expect(second.status).toBe(200);
      expect(second.body).toEqual({
        creatorId,
        userId: user.id,
        following: true,
      });

      const count = await get(`${path}/count`).expect(200);
      expect(count.body).toEqual({ creatorId, count: 1 });

      const status = await get(`${path}/${user.id}`).expect(200);
      expect(status.body).toEqual({ following: true });
    });

    it('count volta a 0 e status vira false depois de deixar de seguir', async () => {
      const user = await createUser();
      const path = `/creators/${creatorId}/followers`;

      await post(path).send({ userId: user.id }).expect(201);
      await del(`${path}/${user.id}`).expect(204);

      const count = await get(`${path}/count`).expect(200);
      expect(count.body).toEqual({ creatorId, count: 0 });

      const status = await get(`${path}/${user.id}`).expect(200);
      expect(status.body).toEqual({ following: false });
    });

    it('DELETE é idempotente e responde 204 mesmo sem seguir', async () => {
      const user = await createUser();
      const path = `/creators/${creatorId}/followers/${user.id}`;

      await del(path).expect(204);
      await del(path).expect(204);

      const count = await get(
        `/creators/${creatorId}/followers/count`,
      ).expect(200);
      expect(count.body).toEqual({ creatorId, count: 0 });
    });

    it('responde 404 quando a criadora não existe', async () => {
      const user = await createUser();
      const missingCreator = randomUUID();

      await post(`/creators/${missingCreator}/followers`)
        .send({ userId: user.id })
        .expect(404);
      await get(`/creators/${missingCreator}/followers/count`).expect(404);
    });

    it('responde 404 quando o usuário não existe', async () => {
      const missingUser = randomUUID();

      await post(`/creators/${creatorId}/followers`)
        .send({ userId: missingUser })
        .expect(404);
      await get(`/creators/${creatorId}/followers/${missingUser}`).expect(404);
      await del(`/creators/${creatorId}/followers/${missingUser}`).expect(404);
    });

    it('responde 400 para UUID inválido no path e no body', async () => {
      await get(`/creators/${creatorId}/followers/not-a-uuid`).expect(400);
      await del(`/creators/${creatorId}/followers/not-a-uuid`).expect(400);
      await post(`/creators/${creatorId}/followers`)
        .send({ userId: 'abc' })
        .expect(400);
    });

    it('concorrência: 10 POSTs simultâneos resultam em count 1, sem 500', async () => {
      const user = await createUser();
      const path = `/creators/${creatorId}/followers`;

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          post(path).send({ userId: user.id }),
        ),
      );

      const statuses = responses.map((response) => response.status);
      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 200)).toHaveLength(9);
      expect(statuses.some((status) => status >= 500)).toBe(false);

      const count = await get(`${path}/count`).expect(200);
      expect(count.body).toEqual({ creatorId, count: 1 });
    });
  });
});
