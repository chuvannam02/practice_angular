import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LargeFormComponent } from './large-form.component';
import { WorkflowLabComponent } from './workflow-lab.component';

describe('WorkflowLabComponent', () => {
    let fixture: ComponentFixture<WorkflowLabComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WorkflowLabComponent],
            providers: [provideNoopAnimations()],
        }).compileComponents();
        fixture = TestBed.createComponent(WorkflowLabComponent);
        fixture.detectChanges();
    });

    it('creates demos on demand and destroys controls/validators when closed', fakeAsync(() => {
        expect(fixture.debugElement.query(By.directive(LargeFormComponent))).toBeNull();
        fixture.nativeElement.querySelector('[data-action="toggle-workflow-lab"]').click();
        fixture.detectChanges();
        const form = fixture.debugElement.query(By.directive(LargeFormComponent)).componentInstance as LargeFormComponent;
        form.activate(0);
        form.changeControl.setValue('admin');
        tick(300);
        fixture.nativeElement.querySelector('[data-action="toggle-workflow-lab"]').click();
        fixture.detectChanges();
        tick(1000);
        expect(fixture.debugElement.query(By.directive(LargeFormComponent))).toBeNull();
        expect(form.requestCounts().change).toBe(1);
        fixture.nativeElement.querySelector('[data-action="toggle-workflow-lab"]').click();
        fixture.detectChanges();
        const fresh = fixture.debugElement.query(By.directive(LargeFormComponent)).componentInstance as LargeFormComponent;
        expect(fresh).not.toBe(form);
        expect(fresh.fields().length).toBe(0);
        expect(fresh.draftCount()).toBe(0);
    }));
});
