import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { Task } from '../models';

@Injectable({
  providedIn: 'root'
})
export class PlannerService {
  private currentDateSubject = new BehaviorSubject<Date>(new Date());
  public currentDate$ = this.currentDateSubject.asObservable();

  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$ = this.tasksSubject.asObservable();

  private currentUserId: string | null = null;

  constructor(
    private database: DatabaseService,
    private authService: AuthService
  ) {
    // Подписываемся на изменения пользователя
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.loadTasks();
      } else {
        this.currentUserId = null;
        this.tasksSubject.next([]);
      }
    });
  }

  setCurrentDate(date: Date): void {
    console.log('PlannerService: Setting current date from', this.currentDateSubject.value, 'to', date);
    // Важно: создаем новый объект Date чтобы триггерить изменение
    const newDate = new Date(date);
    this.currentDateSubject.next(newDate);
  }

  getCurrentDate(): Date {
    return this.currentDateSubject.value;
  }

  getCurrentDateObservable(): Observable<Date> {
    return this.currentDate$;
  }

  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  async loadTasks(): Promise<void> {
    if (!this.currentUserId) {
      this.tasksSubject.next([]);
      return;
    }

    try {
      const tasks = await this.database.tasks
        .where('userId')
        .equals(this.currentUserId)
        .toArray();
      console.log('PlannerService: Loaded tasks', tasks.length);
      this.tasksSubject.next(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.tasksSubject.next([]);
    }
  }

  async addTask(taskData: Partial<Task>): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const task: Task = {
        id: this.generateId(),
        userId: this.currentUserId,
        title: taskData.title || '',
        description: taskData.description,
        date: taskData.date || new Date(),
        completed: taskData.completed || false,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        time: taskData.time || '09:00',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.database.tasks.add(task);
      await this.loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async updateTask(updatedTask: Task): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    if (updatedTask.userId !== this.currentUserId) {
      throw new Error('Access denied');
    }

    try {
      const taskToUpdate = {
        ...updatedTask,
        updatedAt: new Date()
      };
      await this.database.tasks.put(taskToUpdate);
      await this.loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async toggleTaskCompletion(taskId: string): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const task = await this.database.tasks.get(taskId);
      if (task && task.userId === this.currentUserId) {
        const updatedTask = {
          ...task,
          completed: !task.completed,
          updatedAt: new Date()
        };
        await this.database.tasks.put(updatedTask);
        await this.loadTasks();
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const task = await this.database.tasks.get(taskId);
      if (task && task.userId === this.currentUserId) {
        await this.database.tasks.delete(taskId);
        await this.loadTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  getTasksForDate(date: Date): Task[] {
    if (!this.currentUserId) {
      return [];
    }

    const currentTasks = this.tasksSubject.value;
    const targetDate = new Date(date).toDateString();

    console.log('PlannerService: Filtering tasks for date:', targetDate);
    console.log('PlannerService: Total tasks available:', currentTasks.length);

    const filteredTasks = currentTasks.filter(task => {
      const taskDate = new Date(task.date).toDateString();
      const matches = taskDate === targetDate && task.userId === this.currentUserId;
      if (matches) {
        console.log('PlannerService: Task matches:', task.title, taskDate);
      }
      return matches;
    });

    console.log('PlannerService: Filtered tasks count:', filteredTasks.length);
    return filteredTasks;
  }

  async getTasksForUser(userId: string): Promise<Task[]> {
    try {
      return await this.database.tasks
        .where('userId')
        .equals(userId)
        .toArray();
    } catch (error) {
      console.error('Error getting tasks for user:', error);
      return [];
    }
  }

  async saveTask(task: Task): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    if (task.userId !== this.currentUserId) {
      throw new Error('Access denied');
    }

    try {
      const taskToSave = {
        ...task,
        updatedAt: new Date()
      };
      await this.database.tasks.put(taskToSave);
      await this.loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  }

  getMonthlyStats(): any {
    if (!this.currentUserId) {
      return { completedTasks: 0, totalTasks: 0, productivity: 0 };
    }

    const currentTasks = this.tasksSubject.value.filter(task => task.userId === this.currentUserId);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTasks = currentTasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === currentYear;
    });

    const completed = monthlyTasks.filter(task => task.completed).length;
    const total = monthlyTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completedTasks: completed,
      totalTasks: total,
      productivity: completionRate,
      pendingTasks: total - completed
    };
  }

  async resetUserTasks(): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const userTasks = await this.database.tasks
        .where('userId')
        .equals(this.currentUserId)
        .toArray();

      for (const task of userTasks) {
        await this.database.tasks.delete(task.id);
      }

      console.log(`Tasks for user ${this.currentUserId} have been reset`);
      await this.loadTasks();
    } catch (error) {
      console.error('Error resetting user tasks:', error);
      throw error;
    }
  }

  async resetAllTasks(): Promise<void> {
    try {
      await this.database.tasks.clear();
      console.log('All tasks for all users have been reset');
      await this.loadTasks();
    } catch (error) {
      console.error('Error resetting all tasks:', error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
