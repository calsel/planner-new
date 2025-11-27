import { Component, OnInit } from '@angular/core';
import { PlannerService, Task, TaskStatus } from '../../services/planner.service';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  newTask = {
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'queue' as 'queue' | 'in-progress' | 'review' | 'done',
    time: '09:00'
  };
  showAddForm = false;
  currentDate = new Date();
  taskStatus = TaskStatus;

  constructor(private plannerService: PlannerService) {}

  ngOnInit(): void {
    this.plannerService.getCurrentDate().subscribe(date => {
      this.currentDate = date;
      this.loadTasks();
    });

    this.plannerService.getTasks().subscribe(() => {
      this.loadTasks();
    });
  }

  loadTasks(): void {
    this.tasks = this.plannerService.getTasksForDate(this.currentDate);
    this.tasks.sort((a, b) => a.time.localeCompare(b.time));
  }

  addTask(): void {
    if (this.newTask.title.trim()) {
      this.plannerService.addTask({
        ...this.newTask,
        date: new Date(this.currentDate),
        completed: false
      });

      this.resetForm();
      this.showAddForm = false;
    }
  }

  toggleTaskCompletion(task: Task): void {
    this.plannerService.toggleTaskCompletion(task.id);
  }

  updateTaskStatus(task: Task, newStatus: 'queue' | 'in-progress' | 'review' | 'done'): void {
    const updatedTask = { ...task, status: newStatus };
    this.plannerService.updateTask(updatedTask);
  }

  deleteTask(task: Task): void {
    if (confirm('Удалить эту задачу?')) {
      this.plannerService.deleteTask(task.id);
    }
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getStatusIcon(status: string): string {
    return this.taskStatus[status as keyof typeof TaskStatus]?.icon || '📝';
  }

  getStatusLabel(status: string): string {
    return this.taskStatus[status as keyof typeof TaskStatus]?.label || 'Неизвестно';
  }

  private resetForm(): void {
    this.newTask = {
      title: '',
      description: '',
      priority: 'medium',
      status: 'queue',
      time: '09:00'
    };
  }
}
