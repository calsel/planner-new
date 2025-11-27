import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, InviteCode } from '../models/auth.models';
import { Task } from '../models/planner.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = 'https://your-api.com/api';

  constructor(private http: HttpClient) {}

  // Users
  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/auth/login`, { email, password });
  }

  register(userData: any): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/auth/register`, userData);
  }

  // Tasks
  getTasks(userId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API_URL}/users/${userId}/tasks`);
  }

  createTask(task: Task): Observable<Task> {
    return this.http.post<Task>(`${this.API_URL}/tasks`, task);
  }

  // Invite Codes
  getInviteCodes(): Observable<InviteCode[]> {
    return this.http.get<InviteCode[]>(`${this.API_URL}/invite-codes`);
  }
}
