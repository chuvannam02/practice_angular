import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse } from './auth.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private readonly http = inject(HttpClient);

    private readonly TOKEN_KEY = 'access_token';

    login(payload: LoginRequest): Observable<LoginResponse> {
        return this.http
            .post<LoginResponse>(
                'http://localhost:8080/auth/login',
                payload
            )
            .pipe(
                tap(res => {
                    localStorage.setItem(
                        this.TOKEN_KEY,
                        res.token
                    );
                })
            );
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}
