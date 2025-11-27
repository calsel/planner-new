import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { PlannerComponent } from './components/planner/planner.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { HeaderComponent } from './components/header/header.component';
import { LoginComponent } from './components/login/login.component';

import { AuthService } from './services/auth.service';
import { PlannerService } from './services/planner.service';
import { DatabaseService } from './services/database.service';
import { DebugService } from './services/debug.service'; // ← Добавьте эту строку

@NgModule({
  declarations: [
    AppComponent,
    PlannerComponent,
    TaskListComponent,
    HeaderComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot([
      { path: 'login', component: LoginComponent },
      { path: '', component: PlannerComponent },
      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [
    AuthService,
    PlannerService,
    DatabaseService,
    DebugService // ← Добавьте эту строку
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
