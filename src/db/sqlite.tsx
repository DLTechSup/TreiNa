// Android/iOS: banco SQLite nativo. (No site, o Metro usa o sqlite.web.tsx no lugar deste arquivo —
// os dois precisam ter a mesma extensão .tsx para o Metro escolher certo.)
export { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
