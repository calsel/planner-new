import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { PlannerComponent } from './components/planner/planner.component';
import { TaskListComponent } from './components/task-list/task-list.component';

// Сервисы
import { AuthService } from './services/auth.service';
import { DatabaseService } from './services/database.service';
import { PlannerService } from './services/planner.service';
import { MigrationService } from './services/migration.service';

// Гварды
import { AuthGuard } from './guards/auth.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    PlannerComponent,
    TaskListComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule,
    AppRoutingModule
  ],
  providers: [
    AuthService,
    DatabaseService,
    PlannerService, // Убедитесь, что он здесь
    MigrationService,
    AuthGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
