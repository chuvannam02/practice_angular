import { Injectable } from '@angular/core';
import { Asset } from './asset.model';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
    providedIn: 'root',
})
export class AssetService {
    private apiUrl = 'http://localhost:8080/assets';

    constructor(private http: HttpClient) {}

    getAssets(
        keyword?: string,
        status?: string,
        location?: string,
    ): Observable<Asset[]> {
        let params = new HttpParams();
        if (keyword) params = params.set('keyword', keyword);
        if (status) params = params.set('status', status);
        if (location) params = params.set('location', location);
        return this.http.get<Asset[]>(this.apiUrl, { params });
    }

    createAsset(asset: Asset): Observable<Asset> {
        return this.http.post<Asset>(this.apiUrl, asset);
    }

    updateAsset(id: number, asset: Asset): Observable<Asset> {
        return this.http.put<Asset>(`${this.apiUrl}/${id}`, asset);
    }

    deleteAsset(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
