import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status: 'queue' | 'in-progress' | 'review' | 'done';
  time: string;
  date: Date;
  userId: string;
}

export interface DayPlan {
  date: Date;
  tasks: Task[];
  notes: string;
  userId: string;
}

export interface MonthlyStats {
  completedTasks: number;
  totalTasks: number;
  productivity: number;
  userId: string;
}

export const TaskStatus = {
  queue: { label: 'В очереди', color: '#e2e8f0', icon: '⏳' },
  'in-progress': { label: 'В работе', color: '#feebc8', icon: '🔄' },
  review: { label: 'На проверке', color: '#bee3f8', icon: '👀' },
  done: { label: 'Выполнено', color: '#c6f6d5', icon: '✅' }
};

@Injectable({
  providedIn: 'root'
})
export class PlannerService {
  private tasks: Task[] = [];
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private currentDate = new BehaviorSubject<Date>(new Date());

  constructor(private authService: AuthService) {
    this.loadFromLocalStorage();

    this.authService.currentUser$.subscribe(() => {
      this.loadFromLocalStorage();
    });
  }

  getTasks(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  getCurrentDate(): Observable<Date> {
    return this.currentDate.asObservable();
  }

  addTask(task: Omit<Task, 'id' | 'userId'>): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const newTask: Task = {
      ...task,
      id: this.generateId(),
      userId: currentUser.id
    };
    this.tasks.push(newTask);
    this.updateStorage();
  }

  updateTask(updatedTask: Task): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || updatedTask.userId !== currentUser.id) return;

    const index = this.tasks.findIndex(t => t.id === updatedTask.id && t.userId === currentUser.id);
    if (index !== -1) {
      this.tasks[index] = updatedTask;
      this.updateStorage();
    }
  }

  deleteTask(taskId: string): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    this.tasks = this.tasks.filter(t => t.id !== taskId || t.userId !== currentUser.id);
    this.updateStorage();
  }

  toggleTaskCompletion(taskId: string): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const task = this.tasks.find(t => t.id === taskId && t.userId === currentUser.id);
    if (task) {
      task.completed = !task.completed;
      this.updateStorage();
    }
  }

  setCurrentDate(date: Date): void {
    this.currentDate.next(date);
  }

  getTasksForDate(date: Date): Task[] {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return [];

    return this.tasks.filter(task =>
      this.isSameDate(new Date(task.date), date) && task.userId === currentUser.id
    );
  }

  getMonthlyStats(): MonthlyStats {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return { completedTasks: 0, totalTasks: 0, productivity: 0, userId: '' };
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthTasks = this.tasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === currentYear &&
        task.userId === currentUser.id;
    });

    const completedTasks = monthTasks.filter(task => task.completed).length;
    const totalTasks = monthTasks.length;
    const productivity = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      completedTasks,
      totalTasks,
      productivity: Math.round(productivity),
      userId: currentUser.id
    };
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromLocalStorage(): void {
    const currentUser = this.authService.getCurrentUser();
    const saved = localStorage.getItem('planner-tasks');

    if (saved) {
      try {
        const allTasks = JSON.parse(saved);
        if (currentUser) {
          this.tasks = allTasks.filter((task: Task) => task.userId === currentUser.id)
            .map((task: any) => ({
              ...task,
              date: new Date(task.date)
            }));
        } else {
          this.tasks = [];
        }
      } catch (e) {
        this.tasks = [];
      }
    } else {
      this.tasks = [];
    }
    this.tasksSubject.next(this.tasks);
  }

  private updateStorage(): void {
    const allTasks = JSON.parse(localStorage.getItem('planner-tasks') || '[]');
    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      const otherTasks = allTasks.filter((task: Task) => task.userId !== currentUser.id);
      const updatedTasks = [...otherTasks, ...this.tasks];
      localStorage.setItem('planner-tasks', JSON.stringify(updatedTasks));
    }

    this.tasksSubject.next(this.tasks);
  }
}
