import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DebugService {

  constructor() { }

  async debugDatabase(): Promise<void> {
    try {
      // @ts-ignore
      const db = await import('../../db/db.json', { assert: { type: 'json' } });
      console.log('📦 Database structure:', db);

      // Check if tasks exist
      // @ts-ignore
      if (db.default && db.default.tasks) {
        // @ts-ignore
        console.log('📝 Tasks found:', db.default.tasks.length);
        // @ts-ignore
        db.default.tasks.forEach((task: any, index: number) => {
          console.log(`  ${index + 1}. ${task.title} [${task.completed ? '✅' : '⏳'}]`);
        });
      }

      // Check if users exist
      // @ts-ignore
      if (db.default && db.default.users) {
        // @ts-ignore
        console.log('👥 Users found:', db.default.users.length);
        // @ts-ignore
        db.default.users.forEach((user: any, index: number) => {
          console.log(`  ${index + 1}. ${user.email} (${user.role})`);
        });
      }

      // Check if invite codes exist
      // @ts-ignore
      if (db.default && db.default.inviteCodes) {
        // @ts-ignore
        console.log('🎫 Invite codes found:', db.default.inviteCodes.length);
        // @ts-ignore
        db.default.inviteCodes.forEach((code: any, index: number) => {
          console.log(`  ${index + 1}. ${code.code} - ${code.status} (${code.createdAt})`);
        });
      }

      return; // ДОБАВЛЕНО: возвращаемое значение
    } catch (error) {
      console.error('❌ Debug error:', error);
      throw error;
    }
  }
}
