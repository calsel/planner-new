import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, RegisterData, InviteCode } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./auth.component.css']
})
export class RegisterComponent {
  registerData: RegisterData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  };
  errorMessage: string = '';
  isLoading: boolean = false;
  availableCodes: string[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.loadAvailableCodes();
  }

  async onRegister(): Promise<void> {
    if (!this.registerData.name || !this.registerData.email ||
      !this.registerData.password || !this.registerData.inviteCode) {
      this.errorMessage = 'Пожалуйста, заполните все поля';
      return;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Пароли не совпадают';
      return;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Пароль должен содержать минимум 6 символов';
      return;
    }

    if (!this.authService.validateInviteCode(this.registerData.inviteCode)) {
      this.errorMessage = 'Неверный или уже использованный инвайт-код';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const success = await this.authService.register(this.registerData);

      if (success) {
        this.router.navigate(['/planner']);
      } else {
        this.errorMessage = 'Пользователь с таким email уже существует или неверный инвайт-код';
      }
    } catch (error) {
      this.errorMessage = 'Ошибка при регистрации. Попробуйте еще раз.';
      console.error('Registration error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private loadAvailableCodes(): void {
    const availableCodes = this.authService.getAvailableInviteCodes();
    this.availableCodes = availableCodes.map((code: InviteCode) => code.code);
  }
}
