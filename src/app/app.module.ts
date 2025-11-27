import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { PlannerComponent } from './components/planner/planner.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'planner', component: PlannerComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/planner', pathMatch: 'full' },
  { path: '**', redirectTo: '/planner' }
];

@NgModule({
  declarations: [
    AppComponent,
    TaskListComponent,
    LoginComponent,
    RegisterComponent,
    PlannerComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
