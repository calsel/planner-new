export class EncryptionUtil {
  private static readonly KEY = 'planner-2024-secret-key';

  // Простое шифрование (для демо-целей)
  // В реальном приложении используйте более безопасные методы
  static encrypt(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.KEY.charCodeAt(i % this.KEY.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result); // Кодируем в base64
  }

  static decrypt(encryptedText: string): string {
    try {
      const decoded = atob(encryptedText);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ this.KEY.charCodeAt(i % this.KEY.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  // Хеширование для более безопасного хранения
  static async hashPassword(password: string): Promise<string> {
    // Используем SubtleCrypto API для настоящего хеширования
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.KEY);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Проверка пароля с хешем
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const newHash = await this.hashPassword(password);
    return newHash === hash;
  }
}
