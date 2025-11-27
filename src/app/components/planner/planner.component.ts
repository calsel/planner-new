import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { PlannerService } from '../../services/planner.service';
import { DatabaseService } from '../../services/database.service';
import { User, InviteCode, Task } from '../../models';

@Component({
  selector: 'app-planner',
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css']
})
export class PlannerComponent implements OnInit {
  currentUser: User | null = null;
  isAdmin = false;
  monthlyStats: any = {};
  todayStats: any = {};
  priorityStats: any = {};

  // Для адаптивности
  isMobile = false;

  // Текущая выбранная дата
  currentDate = new Date();

  // Для инвайт-кодов
  userCodes: InviteCode[] = [];
  allCodes: InviteCode[] = [];
  availableCodes: InviteCode[] = [];
  usedCodes: InviteCode[] = [];
  newInviteCode = '';
  isLoading = false;
  showInvitePopup = false;
  showAdminPanel = false;
  newCodeInput = '';
  isGeneratingCode = false;

  // Задачи для текущей даты
  currentDateTasks: Task[] = [];

  // Вычисляемые свойства для шаблона
  get completedTasksCount(): number {
    return this.currentDateTasks.filter(t => t.completed).length;
  }

  get pendingTasksCount(): number {
    return this.currentDateTasks.filter(t => !t.completed).length;
  }

  get completionPercentage(): number {
    if (this.currentDateTasks.length === 0) return 0;
    return Math.round((this.completedTasksCount / this.currentDateTasks.length) * 100);
  }

  // Для доступа к Math в шаблоне
  Math = Math;

  constructor(
    private authService: AuthService,
    private plannerService: PlannerService,
    private database: DatabaseService
  ) {}

  async ngOnInit() {
    this.checkScreenSize();

    // Подписываемся на изменения задач
    this.plannerService.tasks$.subscribe(tasks => {
      this.updateStats();
      this.updateCurrentDateTasks();
    });

    // Подписываемся на изменения пользователя
    this.authService.currentUser$.subscribe(async user => {
      this.currentUser = user;
      this.isAdmin = this.authService.isAdmin(user);
      if (user) {
        await this.loadUserInviteCodes();
        if (this.isAdmin) {
          await this.loadAllInviteCodes();
        }
      }
      this.updateStats();
      this.updateCurrentDateTasks();
    });

    // Подписываемся на изменения даты - ВАЖНО!
    this.plannerService.currentDate$.subscribe(date => {
      this.currentDate = date;
      this.updateCurrentDateTasks(); // Обновляем задачи при изменении даты
      this.updateStats(); // Обновляем статистику
    });

    this.updateStats();
    this.updateCurrentDateTasks();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }

  private updateStats(): void {
    // Основная статистика месяца
    this.monthlyStats = this.plannerService.getMonthlyStats();

    // Статистика за сегодня
    this.todayStats = this.getTodayStats();

    // Статистика по приоритетам
    this.priorityStats = this.getPriorityStats();

    // Добавляем pending tasks в monthlyStats
    this.monthlyStats.pendingTasks = this.monthlyStats.totalTasks - this.monthlyStats.completedTasks;
  }

  private updateCurrentDateTasks(): void {
    // Получаем задачи для текущей выбранной даты
    this.currentDateTasks = this.plannerService.getTasksForDate(this.currentDate);
  }

  private getTodayStats(): any {
    const today = new Date();
    const todayTasks = this.plannerService.getTasksForDate(today);
    const completedToday = todayTasks.filter(task => task.completed).length;
    const totalToday = todayTasks.length;
    const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    return {
      total: totalToday,
      completed: completedToday,
      pending: totalToday - completedToday,
      completionRate: completionRate
    };
  }

  private getPriorityStats(): any {
    const tasks = this.plannerService.getTasksForDate(this.currentDate);
    return {
      high: tasks.filter(task => task.priority === 'high').length,
      medium: tasks.filter(task => task.priority === 'medium').length,
      low: tasks.filter(task => task.priority === 'low').length
    };
  }

  // Навигация по датам
  previousDay(): void {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() - 1);
    this.plannerService.setCurrentDate(newDate);
  }

  nextDay(): void {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() + 1);
    this.plannerService.setCurrentDate(newDate);
  }

  setToday(): void {
    this.plannerService.setCurrentDate(new Date());
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
      }
    } catch (error) {
      console.error('Error generating invite code:', error);
    } finally {
      this.isLoading = false;
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Code copied:', text);
    });
  }

  toggleInvitePopup() {
    this.showInvitePopup = !this.showInvitePopup;
    if (this.showInvitePopup) {
      this.loadUserInviteCodes();
    }
  }

  toggleAdminPanel() {
    this.showAdminPanel = !this.showAdminPanel;
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
    if (!confirm('Сбросить все инвайт-коды?')) return;

    try {
      await this.authService.resetInviteCodes();
      await this.loadAllInviteCodes();
    } catch (error) {
      console.error('Error resetting codes:', error);
    }
  }

  async resetAllTasks() {
    if (!this.isAdmin) return;
    if (!confirm('Удалить ВСЕ задачи всех пользователей?')) return;

    try {
      await this.plannerService.resetAllTasks();
      this.updateStats();
    } catch (error) {
      console.error('Error resetting tasks:', error);
    }
  }

  // Сброс задач только текущего пользователя
  async resetMyTasks() {
    if (!confirm('Удалить ВСЕ ваши задачи?')) return;

    try {
      await this.plannerService.resetUserTasks();
      this.updateStats();
      alert('Ваши задачи успешно сброшены');
    } catch (error) {
      console.error('Error resetting user tasks:', error);
      alert('Ошибка при сбросе задач');
    }
  }
}
