import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/authservice.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../core/services/data-service';
import * as appConstants from 'src/app/app.constants';
import { Subscription } from 'rxjs';
import { SbiProjectModel } from 'src/app/core/models/sbi-project';
import { MatDialog } from '@angular/material/dialog';
import { BreadcrumbService } from 'xng-breadcrumb';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { TestCaseModel } from 'src/app/core/models/testcase';
import Utils from 'src/app/app.utils';
import { SdkProjectModel } from 'src/app/core/models/sdk-project';
import { UserProfileService } from 'src/app/core/services/user-profile.service';
import { TranslateService } from '@ngx-translate/core';
import { AbisProjectModel } from 'src/app/core/models/abis-project';

@Component({
  selector: 'app-viewcollections',
  templateUrl: './view-collections.component.html',
  styleUrls: ['./view-collections.component.css'],
})
export class ViewCollectionsComponent implements OnInit {
  collectionId: string;
  collectionName: string;
  projectId: string;
  projectType: string;
  collectionForm = new FormGroup({});
  subscriptions: Subscription[] = [];
  dataLoaded = false;
  sbiProjectData: SbiProjectModel;
  sdkProjectData: SdkProjectModel;
  abisProjectData: AbisProjectModel;
  dataSource: MatTableDataSource<TestCaseModel>;
  displayedColumns: string[] = [
    'testId',
    'testName',
    'testDescription',
    'validatorDefs',
    'scrollIcon'
  ];
  dataSubmitted = false;
  @ViewChild(MatSort) sort: MatSort;
  textDirection: any = this.userProfileService.getTextDirection();
  resourceBundleJson: any = {};

  constructor(
    public authService: AuthService,
    private activatedRoute: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private dataService: DataService,
    private userProfileService: UserProfileService,
    private translate: TranslateService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  async ngOnInit() {
    this.translate.use(this.userProfileService.getUserPreferredLanguage());
    this.resourceBundleJson = await Utils.getResourceBundle(this.userProfileService.getUserPreferredLanguage(), this.dataService);
    this.initForm();
    await this.initAllParams();
    await this.getCollection();
    this.populateCollection();
    if (this.projectType == appConstants.SBI) {
      await this.getSbiProjectDetails();
      this.initBreadCrumb();
    }
    if (this.projectType == appConstants.SDK) {
      await this.getSdkProjectDetails();
      this.initBreadCrumb();
    }
    if (this.projectType == appConstants.ABIS) {
      await this.getAbisProjectDetails();
      this.initBreadCrumb();
    }
    await this.getTestcasesForCollection();
    this.dataSource.sort = this.sort;
    this.dataLoaded = true;
  }

  initBreadCrumb() {
    const breadcrumbLabels = this.resourceBundleJson['breadcrumb'];
    if (breadcrumbLabels) {
      this.breadcrumbService.set('@homeBreadCrumb', `${breadcrumbLabels.home}`);
      if (this.sbiProjectData) {
        this.breadcrumbService.set(
          '@projectBreadCrumb',
          `${this.projectType} ${breadcrumbLabels.project} - ${this.sbiProjectData.name}`
        );
      }
      if (this.sdkProjectData) {
        this.breadcrumbService.set(
          '@projectBreadCrumb',
          `${this.projectType} ${breadcrumbLabels.project} - ${this.sdkProjectData.name}`
        );
       
      }
      if (this.abisProjectData) {
        this.breadcrumbService.set(
          '@projectBreadCrumb',
          `${this.projectType} ${breadcrumbLabels.project} - ${this.abisProjectData.name}`
        );
      }
      this.breadcrumbService.set(
        '@collectionBreadCrumb',
        `${this.collectionName}`
      );

    }
  }

  initForm() {
    this.collectionForm.addControl(
      'name',
      new FormControl({ value: '', disabled: true }, [Validators.required])
    );
  }

  initAllParams() {
    return new Promise((resolve) => {
      this.activatedRoute.params.subscribe((param) => {
        this.projectId = param['projectId'];
        this.projectType = param['projectType'];
        this.collectionId = param['collectionId'];
      });
      resolve(true);
    });
  }

  async getCollection() {
    return new Promise((resolve, reject) => {
      this.subscriptions.push(
        this.dataService.getCollection(this.collectionId).subscribe(
          (response: any) => {
            this.collectionName = response['response']['name'];
            resolve(true);
          },
          (errors) => {
            Utils.showErrorMessage(this.resourceBundleJson, errors, this.dialog);
            resolve(false);
          }
        )
      );
    });
  }

  populateCollection() {
    this.collectionForm.controls['name'].setValue(this.collectionName);
  }

  async getSbiProjectDetails() {
    return new Promise((resolve, reject) => {
      this.subscriptions.push(
        this.dataService.getSbiProject(this.projectId).subscribe(
          (response: any) => {
            console.log(response);
            this.sbiProjectData = response['response'];
            console.log(this.sbiProjectData);
            resolve(true);
          },
          (errors) => {
            Utils.showErrorMessage(this.resourceBundleJson, errors, this.dialog);
            resolve(false);
          }
        )
      );
    });
  }
  async getSdkProjectDetails() {
    return new Promise((resolve, reject) => {
      this.subscriptions.push(
        this.dataService.getSdkProject(this.projectId).subscribe(
          (response: any) => {
            this.sdkProjectData = response['response'];
            resolve(true);
          },
          (errors) => {
            Utils.showErrorMessage(this.resourceBundleJson, errors, this.dialog);
            resolve(false);
          }
        )
      );
    });
  }

  async getAbisProjectDetails() {
    return new Promise((resolve, reject) => {
      this.subscriptions.push(
        this.dataService.getAbisProject(this.projectId).subscribe(
          (response: any) => {
            this.abisProjectData = response['response'];
            resolve(true);
          },
          (errors) => {
            Utils.showErrorMessage(this.resourceBundleJson, errors, this.dialog);
            resolve(false);
          }
        )
      );
    });
  }

  async getTestcasesForCollection() {
    return new Promise((resolve, reject) => {
      this.subscriptions.push(
        this.dataService.getTestcasesForCollection(this.collectionId).subscribe(
          (response: any) => {
            let testcases = response['response']['testcases'];
            let testcaseArr = [];
            for (let testcase of testcases) {
              testcaseArr.push(Utils.translateTestcase(testcase,this.resourceBundleJson));
            }
            //sort the testcases based on the testId
            if (testcaseArr && testcaseArr.length > 0) {
              testcaseArr.sort(function (a: TestCaseModel, b: TestCaseModel) {
                if (a.testId > b.testId) return 1;
                if (a.testId < b.testId) return -1;
                return 0;
              });
            }
            this.dataSource = new MatTableDataSource(testcaseArr);
            resolve(true);
          },
          (errors) => {
            Utils.showErrorMessage(this.resourceBundleJson, errors, this.dialog);
            resolve(false);
          }
        )
      );
    });
  }
  async backToProject() {
    await this.router.navigate([
      `toolkit/project/${this.projectType}/${this.projectId}`,
    ]);
  }
}
