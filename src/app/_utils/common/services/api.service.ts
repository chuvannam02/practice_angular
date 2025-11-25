/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/14/2025
 * @Time: 1:00 AM
 * @File: api.service.ts
 */
// api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {ApiResponse} from '../../Response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
    constructor(private http: HttpClient) {}

    get<T>(url: string): Observable<ApiResponse<T>> {
        return this.http.get<ApiResponse<T>>(url);
    }

    post<T>(url: string, body: Partial<T>): Observable<ApiResponse<T>> {
        return this.http.post<ApiResponse<T>>(url, body);
    }
}
