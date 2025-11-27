import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterData, InviteCode } from '../../models';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerData: RegisterData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  };

  availableCodes: string[] = [];
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  isCheckingCode = false;
  codeValidationMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadAvailableCodes();
    // Для отладки
    await this.authService.debugInviteCodes();
  }

  async loadAvailableCodes() {
    try {
      console.log('Loading available invite codes...');
      const availableCodes = await this.authService.getAvailableInviteCodes();
      this.availableCodes = availableCodes.map((code: InviteCode) => code.code);
      console.log('Loaded available codes:', this.availableCodes);
    } catch (error) {
      console.error('Error loading invite codes:', error);
    }
  }

  async onInviteCodeChange(): Promise<void> {
    // Очищаем предыдущие ошибки связанные с инвайт-кодом
    if (this.errorMessage && this.errorMessage.includes('инвайт-код')) {
      this.errorMessage = '';
    }

    // Проверка кода в реальном времени
    if (this.registerData.inviteCode && this.registerData.inviteCode.trim().length >= 3) {
      await this.validateInviteCodeRealTime();
    } else {
      this.codeValidationMessage = '';
    }
  }

  private async validateInviteCodeRealTime(): Promise<void> {
    this.isCheckingCode = true;
    this.codeValidationMessage = '🔍 Проверка кода...';

    try {
      const isValid = await this.authService.validateInviteCode(this.registerData.inviteCode);
      if (isValid) {
        this.codeValidationMessage = '✅ Код действителен';
      } else {
        this.codeValidationMessage = '❌ Код недействителен или уже использован';
      }
    } catch (error) {
      this.codeValidationMessage = '⚠️ Ошибка проверки кода';
    } finally {
      this.isCheckingCode = false;
    }
  }

  async onSubmit() {
    console.log('Form submitted with data:', { ...this.registerData, password: '***' });

    // Валидация
    if (!this.registerData.name || !this.registerData.email ||
      !this.registerData.password || !this.registerData.confirmPassword ||
      !this.registerData.inviteCode) {
      this.errorMessage = 'Пожалуйста, заполните все поля';
      return;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Пароль должен содержать минимум 6 символов';
      return;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Пароли не совпадают';
      return;
    }

    if (!this.isValidEmail(this.registerData.email)) {
      this.errorMessage = 'Введите корректный email адрес';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      console.log('Starting registration process...');

      // Проверяем инвайт-код еще раз перед регистрацией
      const isValidCode = await this.authService.validateInviteCode(this.registerData.inviteCode);
      console.log('Final invite code validation:', isValidCode);

      if (!isValidCode) {
        this.errorMessage = 'Неверный или уже использованный инвайт-код';
        this.isLoading = false;
        return;
      }

      const success = await this.authService.register(this.registerData);
      console.log('Registration result:', success);

      if (success) {
        console.log('Registration successful, navigating to planner');
        this.router.navigate(['/planner']);
      } else {
        this.errorMessage = 'Ошибка регистрации. Возможно, пользователь с таким email уже существует.';
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.errorMessage = 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.';
    } finally {
      this.isLoading = false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSubmit();
    }
  }
}
