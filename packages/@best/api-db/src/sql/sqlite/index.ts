import SQLiteDatabase from './db'
import { SQLAdapter } from '../adapter'
import { ApiDatabaseConfig } from '@best/types';

export default class SQLiteAdapter extends SQLAdapter {
    constructor(config: ApiDatabaseConfig) {
        super(config, new SQLiteDatabase(config))
    }
}