import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  inviteCode = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async login() {
    if (!this.inviteCode.trim()) {
      this.errorMessage = 'Введите инвайт-код';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const success = await this.authService.login(this.inviteCode);
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.errorMessage = 'Неверный инвайт-код';
      }
    } catch (error) {
      this.errorMessage = 'Ошибка входа';
    } finally {
      this.isLoading = false;
    }
  }

  onInputChange() {
    this.errorMessage = '';
  }
}
