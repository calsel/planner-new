import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { MigrationService } from './services/migration.service';
import { PlannerService } from './services/planner.service';
import { User, InviteCode } from './models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  currentUser: User | null = null;
  monthlyStats: any = {};
  tasksToday = 0;
  currentDate = new Date();
  showHeader = false;
  isAdmin = false;

  // Для управления кодами
  showInvitePopup = false;
  userCodes: InviteCode[] = [];
  allCodes: InviteCode[] = [];
  availableCodes: InviteCode[] = [];
  usedCodes: InviteCode[] = [];
  newInviteCode = '';
  isLoading = false;
  newCodeInput = '';
  isGeneratingCode = false;

  constructor(
    private authService: AuthService,
    private migrationService: MigrationService,
    private plannerService: PlannerService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Запускаем миграцию данных при старте приложения
    await this.migrationService.checkAndMigrate();

    // Подписываемся на изменения авторизации
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      this.isAdmin = this.authService.isAdmin(user);
      this.updateHeaderVisibility();

      // Если пользователь авторизован, загружаем данные
      if (user) {
        this.updateStats();
        this.loadUserInviteCodes();
        if (this.isAdmin) {
          this.loadAllInviteCodes();
        }
      }
    });

    // Подписываемся на изменения задач для обновления статистики в header
    this.plannerService.tasks$.subscribe(tasks => {
      this.updateStats();
    });

    // Следим за изменениями маршрута
    this.router.events.subscribe(() => {
      this.updateHeaderVisibility();
    });
  }

  private updateHeaderVisibility(): void {
    const currentRoute = this.router.url;
    const authRoutes = ['/login', '/register'];

    // Показываем шапку только если пользователь авторизован И НЕ на страницах авторизации
    this.showHeader = this.isAuthenticated && !authRoutes.some(route => currentRoute.includes(route));
  }

  // Навигация по датам
  previousDay(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.updateStats();
  }

  nextDay(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.updateStats();
  }

  setToday(): void {
    this.currentDate = new Date();
    this.updateStats();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  private updateStats(): void {
    // Используем реальную статистику из plannerService
    this.monthlyStats = this.plannerService.getMonthlyStats();
    const todayTasks = this.plannerService.getTasksForDate(new Date());
    this.tasksToday = todayTasks.length;
  }

  get formattedDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return this.currentDate.toLocaleDateString('ru-RU', options);
  }

  get isToday(): boolean {
    const today = new Date();
    return this.currentDate.toDateString() === today.toDateString();
  }

  // Методы для инвайт-кодов
  async loadUserInviteCodes() {
    if (!this.currentUser) return;

    try {
      this.userCodes = await this.authService.getUserInviteCodes(this.currentUser.id);
    } catch (error) {
      console.error('Error loading user invite codes:', error);
    }
  }

  async loadAllInviteCodes() {
    try {
      this.allCodes = await this.authService.getAllInviteCodes();
      this.availableCodes = this.allCodes.filter(code => !code.used);
      this.usedCodes = this.allCodes.filter(code => code.used);
    } catch (error) {
      console.error('Error loading all invite codes:', error);
    }
  }

  async generateInviteCode() {
    if (!this.currentUser) return;

    this.isLoading = true;
    try {
      const newCode = await this.authService.createInviteCode();
      if (newCode) {
        this.newInviteCode = newCode;
        await this.loadUserInviteCodes();
        if (this.isAdmin) {
          await this.loadAllInviteCodes();
        }
      } else {
        console.error('Failed to generate invite code');
      }
    } catch (error) {
      console.error('Error generating invite code:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Админские методы
  async generateAdminCode() {
    if (!this.newCodeInput.trim()) return;

    this.isGeneratingCode = true;
    try {
      await this.authService.debugCreateInviteCode(this.newCodeInput.trim());
      this.newCodeInput = '';
      await this.loadAllInviteCodes();
    } catch (error) {
      console.error('Error generating admin code:', error);
    } finally {
      this.isGeneratingCode = false;
    }
  }

  async deleteInviteCode(code: string) {
    if (!this.isAdmin) return;

    if (!confirm('Удалить этот инвайт-код?')) return;

    try {
      const success = await this.authService.deleteInviteCode(code);
      if (success) {
        await this.loadAllInviteCodes();
      }
    } catch (error) {
      console.error('Error deleting invite code:', error);
    }
  }

  async resetAllCodes() {
    if (!this.isAdmin) return;

    if (!confirm('Сбросить все инвайт-коды? Это создаст новые дефолтные коды.')) return;

    try {
      await this.authService.resetInviteCodes();
      await this.loadAllInviteCodes();
      alert('Инвайт-коды успешно сброшены');
    } catch (error) {
      console.error('Error resetting codes:', error);
      alert('Ошибка при сбросе кодов');
    }
  }

  async resetAllTasks() {
    if (!this.isAdmin) return;

    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕ задачи всех пользователей. Продолжить?')) return;

    try {
      await this.plannerService.resetAllTasks();
      this.updateStats(); // Обновляем статистику после сброса
      alert('Все задачи успешно сброшены');
    } catch (error) {
      console.error('Error resetting tasks:', error);
      alert('Ошибка при сбросе задач');
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Code copied:', text);
      // Можно добавить временное уведомление
    });
  }

  toggleInvitePopup() {
    this.showInvitePopup = !this.showInvitePopup;
    if (this.showInvitePopup) {
      this.loadUserInviteCodes();
      if (this.isAdmin) {
        this.loadAllInviteCodes();
      }
    }
  }
}
