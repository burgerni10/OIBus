import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmationService } from '../../shared/confirmation.service';
import { NotificationService } from '../../shared/notification.service';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal, ModalService } from '../../shared/modal.service';
import { FormControlValidationDirective } from '../../shared/form-control-validation.directive';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';
import {
  SouthConnectorItemCommandDTO,
  SouthConnectorItemDTO,
  SouthConnectorItemManifest
} from '../../../../../shared/model/south-connector.model';
import { debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { BoxComponent, BoxTitleDirective } from '../../shared/box/box.component';
import { DatetimePipe } from '../../shared/datetime.pipe';
import { DurationPipe } from '../../shared/duration.pipe';
import { OibFormControl } from '../../../../../shared/model/form.model';
import { createPageFromArray, Page } from '../../../../../shared/model/types';
import { emptyPage } from '../../shared/test-utils';
import { HistoryQueryDTO } from '../../../../../shared/model/history-query.model';
import { HistoryQueryService } from '../../services/history-query.service';
import { EditSouthItemModalComponent } from '../../south/edit-south-item-modal/edit-south-item-modal.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'oib-history-query-items',
  standalone: true,
  imports: [
    TranslateModule,
    RouterLink,
    NgIf,
    NgForOf,
    FormControlValidationDirective,
    FormsModule,
    LoadingSpinnerComponent,
    ReactiveFormsModule,
    BoxComponent,
    BoxTitleDirective,
    DatetimePipe,
    DurationPipe
  ],
  templateUrl: './history-query-items.component.html',
  styleUrls: ['./history-query-items.component.scss']
})
export class HistoryQueryItemsComponent implements OnInit {
  @Input() historyQuery: HistoryQueryDTO | null = null;
  @Input() southConnectorItemSchema!: SouthConnectorItemManifest;
  @Input() initItems: Array<SouthConnectorItemDTO> = [];
  @Output() readonly inMemoryItems = new EventEmitter<Array<SouthConnectorItemDTO>>();
  @Input() displayItemToggle = false;

  allItems: Array<SouthConnectorItemDTO> = [];
  private filteredItems: Array<SouthConnectorItemDTO> = [];
  displayedItems: Page<SouthConnectorItemDTO> = emptyPage();
  displaySettings: Array<OibFormControl> = [];

  searchControl = this.fb.control(null as string | null);

  constructor(
    private confirmationService: ConfirmationService,
    private notificationService: NotificationService,
    private modalService: ModalService,
    private historyQueryService: HistoryQueryService,
    private fb: NonNullableFormBuilder
  ) {}

  ngOnInit() {
    this.southConnectorItemSchema.scanMode.subscriptionOnly = true;
    if (!this.historyQuery) {
      this.allItems = this.initItems;
    }
    this.fetchItemsAndResetPage();
    this.displaySettings = this.southConnectorItemSchema.settings.filter(setting => setting.displayInViewMode);

    // subscribe to changes to search control
    this.searchControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe(() => {
      this.filteredItems = this.filter(this.allItems);
      this.changePage(0);
    });
  }

  fetchItemsAndResetPage() {
    if (this.historyQuery) {
      this.historyQueryService.listItems(this.historyQuery.id).subscribe(items => {
        this.allItems = items;
        this.filteredItems = this.filter(items);
        this.changePage(0);
      });
    } else {
      this.filteredItems = this.filter(this.allItems);
      this.changePage(0);
      this.inMemoryItems.emit(this.allItems);
    }
  }

  changePage(pageNumber: number) {
    this.displayedItems = this.createPage(pageNumber);
  }

  private createPage(pageNumber: number): Page<SouthConnectorItemDTO> {
    return createPageFromArray(this.filteredItems, PAGE_SIZE, pageNumber);
  }

  filter(items: Array<SouthConnectorItemDTO>): Array<SouthConnectorItemDTO> {
    const searchText = this.searchControl.value;
    if (!searchText) {
      return items;
    }
    return items.filter(item => item.name.toLowerCase().includes(searchText));
  }

  /**
   * Open a modal to edit a South item
   */
  editItem(southItem: SouthConnectorItemDTO) {
    const modalRef = this.modalService.open(EditSouthItemModalComponent, { size: 'xl' });
    const component: EditSouthItemModalComponent = modalRef.componentInstance;
    component.prepareForEdition(this.southConnectorItemSchema, this.allItems, [], southItem);
    this.refreshAfterEditionModalClosed(modalRef);
  }

  /**
   * Open a modal to create a South item
   */
  addItem() {
    const modalRef = this.modalService.open(EditSouthItemModalComponent, { size: 'xl' });
    const component: EditSouthItemModalComponent = modalRef.componentInstance;
    component.prepareForCreation(this.southConnectorItemSchema, this.allItems, []);
    this.refreshAfterCreationModalClosed(modalRef);
  }

  /**
   * Refresh the South item list when a South item is created
   */
  private refreshAfterCreationModalClosed(modalRef: Modal<any>) {
    modalRef.result
      .pipe(
        switchMap((command: SouthConnectorItemCommandDTO) => {
          if (this.historyQuery) {
            return this.historyQueryService.createItem(this.historyQuery.id, command);
          } else {
            this.allItems.push({ id: '', connectorId: '', ...command });
            return of(null);
          }
        })
      )
      .subscribe(() => {
        this.fetchItemsAndResetPage();
        this.notificationService.success(`history-query.items.created`);
      });
  }

  /**
   * Refresh the South item list when a South item is created
   */
  private refreshAfterEditionModalClosed(modalRef: Modal<any>) {
    modalRef.result
      .pipe(
        switchMap((command: SouthConnectorItemCommandDTO) => {
          if (this.historyQuery) {
            return this.historyQueryService.updateItem(this.historyQuery.id, command.id || '', command);
          } else {
            this.allItems.push({ id: '', connectorId: '', ...command });
            return of(null);
          }
        })
      )
      .subscribe(() => {
        this.fetchItemsAndResetPage();
        this.notificationService.success(`history-query.items.updated`);
      });
  }

  /**
   * Deletes a parser by its ID and refreshes the list
   */
  deleteItem(item: SouthConnectorItemDTO) {
    this.confirmationService
      .confirm({
        messageKey: 'history-query.items.confirm-deletion'
      })
      .pipe(
        switchMap(() => {
          if (this.historyQuery) {
            return this.historyQueryService.deleteItem(this.historyQuery!.id, item.id);
          } else {
            this.allItems = this.allItems.filter(element => element.name !== item.name);
            return of(null);
          }
        })
      )
      .subscribe(() => {
        this.fetchItemsAndResetPage();
        this.notificationService.success('history-query.items.deleted');
      });
  }

  duplicateItem(item: SouthConnectorItemDTO) {
    const modalRef = this.modalService.open(EditSouthItemModalComponent, { size: 'xl' });
    const component: EditSouthItemModalComponent = modalRef.componentInstance;
    component.prepareForCopy(this.southConnectorItemSchema, [], item);
    this.refreshAfterCreationModalClosed(modalRef);
  }

  /**
   * Export items into a csv file
   */
  exportItems() {
    if (this.historyQuery) {
      this.historyQueryService.exportItems(this.historyQuery.id, this.historyQuery.name).subscribe();
    }
  }

  /**
   * Delete all items
   */
  deleteAllItems() {
    this.confirmationService
      .confirm({
        messageKey: 'history-query.items.confirm-delete-all'
      })
      .pipe(
        switchMap(() => {
          if (this.historyQuery) {
            return this.historyQueryService.deleteAllItems(this.historyQuery!.id);
          } else {
            this.allItems = [];
            return of(null);
          }
        })
      )
      .subscribe(() => {
        this.fetchItemsAndResetPage();
        this.notificationService.success('history-query.items.all-deleted');
      });
  }

  onImportDragOver(e: Event) {
    e.preventDefault();
  }

  onImportDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer!.files![0];
    this.importItems(file!);
  }

  onImportClick(e: Event) {
    const fileInput = e.target as HTMLInputElement;
    const file = fileInput!.files![0];
    fileInput.value = '';
    this.importItems(file!);
  }

  importItems(file: File) {
    if (this.historyQuery) {
      this.historyQueryService.uploadItems(this.historyQuery.id, file).subscribe(() => {
        this.notificationService.success('history-query.items.imported');
      });
    }
  }

  toggleItem(item: SouthConnectorItemDTO, value: boolean) {
    if (value) {
      this.historyQueryService
        .enableItem(this.historyQuery!.id, item.id)
        .pipe(
          tap(() => {
            this.notificationService.success('history-query.items.enabled', { name: item.name });
          }),
          switchMap(() => {
            return this.historyQueryService.listItems(this.historyQuery!.id);
          })
        )
        .subscribe(items => {
          this.allItems = items;
          this.filteredItems = this.filter(items);
          this.changePage(this.displayedItems.number);
        });
    } else {
      this.historyQueryService
        .disableItem(this.historyQuery!.id, item.id)
        .pipe(
          tap(() => {
            this.notificationService.success('history-query.items.disabled', { name: item.name });
          }),
          switchMap(() => {
            return this.historyQueryService.listItems(this.historyQuery!.id);
          })
        )
        .subscribe(items => {
          this.allItems = items;
          this.filteredItems = this.filter(items);
          this.changePage(this.displayedItems.number);
        });
    }
  }
}
