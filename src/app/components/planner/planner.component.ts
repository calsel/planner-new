import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PlannerService } from '../../services/planner.service';
import { AuthService, User, InviteCode } from '../../services/auth.service';

@Component({
  selector: 'app-planner',
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css']
})
export class PlannerComponent implements OnInit {
  currentDate = new Date();
  monthlyStats: any;
  tasksToday: number = 0;
  currentUser: User | null = null;
  isAdmin: boolean = false;

  // Управление инвайт-кодами
  showInviteSection: boolean = false;
  newInviteCode: string = '';
  isGeneratingCode: boolean = false;
  availableCodes: InviteCode[] = [];
  userCodes: InviteCode[] = [];

  constructor(
    private plannerService: PlannerService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      this.isAdmin = this.authService.isAdmin(user);
      if (user) {
        this.updateData();
        if (this.isAdmin) {
          this.loadUserCodes();
        }
      }
    });

    this.plannerService.getCurrentDate().subscribe(date => {
      this.currentDate = date;
      this.updateData();
    });

    this.plannerService.getTasks().subscribe(() => {
      this.updateData();
    });
  }

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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  generateInviteCode(): void {
    if (this.currentUser && this.isAdmin && !this.isGeneratingCode) {
      this.isGeneratingCode = true;

      setTimeout(() => {
        const newCode = this.authService.generateInviteCode(this.currentUser!.id);
        if (newCode) {
          this.newInviteCode = newCode;
          this.loadUserCodes();
        } else {
          alert('Только администратор может создавать инвайт-коды');
        }
        this.isGeneratingCode = false;
      }, 500);
    }
  }

  deleteInviteCode(code: string): void {
    if (confirm('Удалить этот инвайт-код? Это действие нельзя отменить.')) {
      const success = this.authService.deleteInviteCode(code);
      if (success) {
        this.loadUserCodes();
      } else {
        alert('Не удалось удалить код. Возможно, он уже был использован или у вас нет прав.');
      }
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private loadUserCodes(): void {
    if (this.currentUser && this.isAdmin) {
      this.userCodes = this.authService.getUserInviteCodes(this.currentUser.id);
      this.availableCodes = this.userCodes.filter(code => !code.used);
    }
  }

  private updateData(): void {
    this.monthlyStats = this.plannerService.getMonthlyStats();
    this.updateTodayTasks();
  }

  private updateTodayTasks(): void {
    const todayTasks = this.plannerService.getTasksForDate(this.currentDate);
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
}
