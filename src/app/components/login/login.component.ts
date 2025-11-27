import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { DebugService } from '../../services/debug.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  inviteCode = '';
  email = '';
  isLoading = false;
  errorMessage = '';
  showAdminHint = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private debugService: DebugService
  ) {}

  ngOnInit() {
    this.checkAdminStatus();
  }

  async checkAdminStatus() {
    const canCreateAdmin = await this.authService.canCreateAdmin();
    this.showAdminHint = canCreateAdmin;
  }

  async login() {
    if (!this.inviteCode.trim()) {
      this.errorMessage = 'Введите инвайт-код';
      return;
    }

    if (!this.email.trim()) {
      this.errorMessage = 'Введите email';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Введите корректный email';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const success = await this.authService.register(this.email, this.inviteCode);
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.errorMessage = 'Неверный инвайт-код или email';
      }
    } catch (error) {
      this.errorMessage = 'Ошибка входа';
    } finally {
      this.isLoading = false;
    }
  }

  // Метод для отладки
  async debugDatabase() {
    console.log('🔧 Запуск отладки...');
    await this.debugService.debugDatabase();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onInputChange() {
    this.errorMessage = '';
  }
}
