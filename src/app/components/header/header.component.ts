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
      this.currentDate = date;
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
    const current = new Date(this.currentDate);
    return today.getFullYear() === current.getFullYear() &&
      today.getMonth() === current.getMonth() &&
      today.getDate() === current.getDate();
  }

  logout(): void {
    this.authService.logout();
  }
}
