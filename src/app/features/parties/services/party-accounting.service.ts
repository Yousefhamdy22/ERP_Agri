import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PartyAccountingSummary, PartyStatementSummary } from '../models/party-accounting.model';

@Injectable({ providedIn: 'root' })
export class PartyAccountingService {
  private base = `${environment.apiUrl}/Parties`;

  constructor(private http: HttpClient) {}

  // GET /Parties/{partyId}/accounting — نفس المسار لعميل أو مورد، بلا تمييز نوع في الرابط.
  getAccounting(partyId: string): Observable<PartyAccountingSummary> {
    return this.http.get<PartyAccountingSummary>(`${this.base}/${partyId}/accounting`);
  }

  // GET /Parties/{partyId}/statement?fromDate=&toDate= — fromDate/toDate اختياريَّان.
  getStatement(partyId: string, fromDate?: string, toDate?: string): Observable<PartyStatementSummary> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<PartyStatementSummary>(`${this.base}/${partyId}/statement`, { params });
  }
}
