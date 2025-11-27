import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlannerService } from '../../services/planner.service';
import { Task } from '../../models';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  showTaskForm = false;
  newTask: Partial<Task> = {
    title: '',
    description: '',
    date: new Date(),
    priority: 'medium',
    status: 'pending',
    time: '09:00'
  };

  private subscription: Subscription = new Subscription();

  constructor(private plannerService: PlannerService) {}

  ngOnInit() {
    console.log('TaskListComponent: Initializing');

    // Ключевое исправление: объединяем подписки на дату и задачи
    this.subscription = combineLatest([
      this.plannerService.currentDate$,
      this.plannerService.tasks$
    ]).subscribe(([currentDate, allTasks]) => {
      console.log('TaskListComponent: Date changed to:', currentDate);
      console.log('TaskListComponent: Total tasks:', allTasks.length);
      this.tasks = this.plannerService.getTasksForDate(currentDate);
      console.log('TaskListComponent: Filtered tasks for date:', this.tasks.length);
    });

    // Инициализация при загрузке
    const currentDate = this.plannerService.getCurrentDate();
    this.tasks = this.plannerService.getTasksForDate(currentDate);
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async addTask() {
    if (!this.newTask.title?.trim()) return;

    try {
      const currentDate = this.plannerService.getCurrentDate();

      const taskToAdd = {
        ...this.newTask,
        date: currentDate,
        completed: false
      };

      console.log('TaskListComponent: Adding task for date:', currentDate);
      await this.plannerService.addTask(taskToAdd);
      this.cancelAddTask();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }

  cancelAddTask() {
    this.showTaskForm = false;
    this.newTask = {
      title: '',
      description: '',
      date: new Date(),
      priority: 'medium',
      status: 'pending',
      time: '09:00'
    };
  }

  async toggleTaskCompletion(task: Task) {
    try {
      await this.plannerService.toggleTaskCompletion(task.id);
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  }

  async updateTaskStatus(task: Task, status: string) {
    try {
      const updatedTask = {
        ...task,
        status: status as 'pending' | 'in-progress' | 'completed'
      };
      await this.plannerService.updateTask(updatedTask);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }

  async deleteTask(taskId: string) {
    if (!confirm('Удалить эту задачу?')) return;

    try {
      await this.plannerService.deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  // Методы для работы со статусами в шаблоне
  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'in-progress': return 'status-in-progress';
      default: return 'status-pending';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      default: return '⏳';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Выполнено';
      case 'in-progress': return 'В процессе';
      default: return 'Ожидание';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  }

  // Helper methods for template
  get completedTasksCount(): number {
    return this.tasks.filter(t => t.completed).length;
  }

  get pendingTasksCount(): number {
    return this.tasks.filter(t => !t.completed).length;
  }

  get completionPercentage(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.completedTasksCount / this.tasks.length) * 100);
  }
}
