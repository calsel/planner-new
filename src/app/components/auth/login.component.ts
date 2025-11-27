import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginData } from '../../models';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./auth.component.css']
})
export class LoginComponent {
  loginData: LoginData = {
    email: '',
    password: ''
  };
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onLogin(): Promise<void> {
    if (!this.loginData.email || !this.loginData.password) {
      this.errorMessage = 'Пожалуйста, заполните все поля';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const success = await this.authService.login(this.loginData);

      if (success) {
        this.router.navigate(['/planner']);
      } else {
        this.errorMessage = 'Неверный email или пароль';
      }
    } catch (error) {
      this.errorMessage = 'Ошибка при входе. Попробуйте еще раз.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  // Дополнительные методы для улучшения UX
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onLogin();
    }
  }

  clearError(): void {
    this.errorMessage = '';
  }
}
