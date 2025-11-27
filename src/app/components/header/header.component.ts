import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { PlannerService } from '../../services/planner.service';
import { User } from '../../models';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  currentDate: Date = new Date();

  constructor(
    private authService: AuthService,
    private plannerService: PlannerService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.plannerService.currentDate$.subscribe(date => {
      console.log('HeaderComponent: Received date change:', date);
      this.currentDate = date;
    });
  }

  previousDay(): void {
    console.log('HeaderComponent: Previous day clicked');
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() - 1);
    this.plannerService.setCurrentDate(newDate);
  }

  nextDay(): void {
    console.log('HeaderComponent: Next day clicked');
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() + 1);
    this.plannerService.setCurrentDate(newDate);
  }

  setToday(): void {
    console.log('HeaderComponent: Today clicked');
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

  // ИСПРАВЛЕННЫЙ МЕТОД: Правильное сравнение дат
  get isToday(): boolean {
    const today = new Date();
    const current = new Date(this.currentDate);

    // Сравниваем год, месяц и день отдельно
    return today.getFullYear() === current.getFullYear() &&
      today.getMonth() === current.getMonth() &&
      today.getDate() === current.getDate();
  }

  // Альтернативный вариант (более надежный):
  // get isToday(): boolean {
  //   const today = new Date();
  //   const current = new Date(this.currentDate);
  //   return today.toDateString() === current.toDateString();
  // }

  logout(): void {
    this.authService.logout();
  }
}
