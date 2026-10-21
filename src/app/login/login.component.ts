import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { FormsModule } from '@angular/forms';
import { AutofocusFirstDirective } from '../_utils/directive/autofocus-first.directive';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        NzCardModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzIconModule,
        NzFlexModule,
        FormsModule,
        AutofocusFirstDirective
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly message = inject(NzMessageService);

    passwordVisible = false;

    loading = false;

    form = this.fb.group({
        email: ['', [Validators.required]],
        password: ['', [Validators.required]],
    });

    submit(): void {
        if (this.form.invalid) {
            Object.values(this.form.controls).forEach((control) => {
                if (control.invalid) {
                    control.markAsDirty();
                    control.updateValueAndValidity({ onlySelf: true });
                }
            });
            return;
        }

        this.loading = true;

        this.authService.login(this.form.getRawValue() as any).subscribe({
            next: () => {
                this.loading = false;
                this.message.success('Đăng nhập thành công');
                this.router.navigateByUrl('/home');
            },
            error: () => {
                this.loading = false;
                this.message.error('Sai tài khoản hoặc mật khẩu');
            },
            complete: () => {
                this.loading = false;
            },
        });
    }
}
