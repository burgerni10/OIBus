import { TestBed } from '@angular/core/testing';

import { HistoryQueryDetailComponent } from './history-query-detail.component';
import { ComponentTester, createMock, stubRoute } from 'ngx-speculoos';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideTestingI18n } from '../../../i18n/mock-i18n';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HistoryQueryService } from '../../services/history-query.service';
import { HistoryQueryDTO } from '../../../../../shared/model/history-query.model';

class HistoryQueryDisplayComponentTester extends ComponentTester<HistoryQueryDetailComponent> {
  constructor() {
    super(HistoryQueryDetailComponent);
  }

  get title() {
    return this.element('#title');
  }

  get description() {
    return this.element('#description');
  }
}

describe('HistoryQueryDisplayComponent', () => {
  let tester: HistoryQueryDisplayComponentTester;
  let historyQueryService: jasmine.SpyObj<HistoryQueryService>;

  const historyQuery: HistoryQueryDTO = {
    id: 'id1',
    name: 'History query',
    description: 'My History query description',
    enabled: true,
    history: {
      maxInstantPerItem: false,
      maxReadInterval: 0,
      readDelay: 200
    },
    southType: 'OPCUA_HA',
    northType: 'OIConnect',
    startTime: '2023-01-01T00:00:00.000Z',
    endTime: '2023-01-01T00:00:00.000Z',
    southSettings: {},
    northSettings: {},
    caching: {
      scanModeId: 'scanModeId1',
      retryInterval: 1000,
      retryCount: 3,
      groupCount: 1000,
      maxSendCount: 10000,
      sendFileImmediately: true,
      maxSize: 30
    },
    archive: {
      enabled: false,
      retentionDuration: 0
    }
  };

  beforeEach(() => {
    historyQueryService = createMock(HistoryQueryService);
    TestBed.configureTestingModule({
      imports: [HistoryQueryDetailComponent],
      providers: [
        provideTestingI18n(),
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: stubRoute({
            params: {
              historyQueryId: 'id1'
            }
          })
        },
        { provide: HistoryQueryService, useValue: historyQueryService }
      ]
    });

    historyQueryService.get.and.returnValue(of(historyQuery));
    tester = new HistoryQueryDisplayComponentTester();
    tester.detectChanges();
  });

  it('should display History query description', () => {
    expect(tester.title).toContainText(historyQuery.name);
    expect(tester.description).toContainText(historyQuery.description);
  });
});