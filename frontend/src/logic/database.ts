import 'dotenv/config';
import pg, { type PoolConfig } from 'pg';
import type { Message } from './ai3';


// Setup pool
const { Pool } = pg;
const poolSettings: PoolConfig = {
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  max: 10,
  idleTimeoutMillis: 30000,
};
if (process.env.ENVIRONMENT !== 'local') {
  poolSettings.ssl = {
    rejectUnauthorized: false,
  };
}
const pool = new Pool(poolSettings);


const init = async() => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id            SERIAL            PRIMARY KEY,
        userEmail     TEXT              NOT NULL,
        title         TEXT              NOT NULL,
        scope         TEXT,
        messages      JSONB[]           NOT NULL,
        created       TIMESTAMPTZ       NOT NULL DEFAULT now(),
        updated       TIMESTAMPTZ       NOT NULL DEFAULT now()
      );
    `);
    console.log('Table successfully created');
  } catch(err) {
    console.error('Failed to create table:', err);
    throw err;
  }
};
init();


export const getChats = async(userEmail: string) => {
  const chats = await pool.query('SELECT * FROM chats WHERE userEmail = $1', [userEmail]);
  return chats.rows;
};


export const getChat = async(userEmail: string, chatId: string) => {
  const chats = await pool.query('SELECT * FROM chats WHERE userEmail = $1 AND id = $2', [userEmail, chatId]);
  return chats.rows[0];
};


export const saveChat = async(userEmail: string, messages: Message[], chatId: string, scopedServer?: string) => {
  let update;
  if (chatId !== '-1') {
    update = await pool.query('UPDATE chats SET messages = $1, updated = now() WHERE id = $2 RETURNING *;', [messages, parseInt(chatId)]);
  } else {
    const title = messages[0].response.content.substring(0, 24);
    update = await pool.query('INSERT INTO chats (userEmail, title, messages, scope) VALUES ($1, $2, $3, $4) RETURNING *', [userEmail, title, messages, scopedServer]);
  }
  return update;
};


export const deleteChat = async(userEmail: string, chatId: string) => {
  const query = await pool.query('DELETE FROM chats WHERE id = $1 AND userEmail = $2;', [parseInt(chatId), userEmail]);
  return query;
};
