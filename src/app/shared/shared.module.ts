import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignatureComponent } from './signature/signature.component';
import { SignaturePadModule } from 'angular2-signaturepad';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CameraComponent } from './camera/camera.component';
import { CostCenterComponent } from './cost-center/cost-center.component';
import { QueryCatComponent } from './query-cat/query-cat.component';
import { QuerySubCatComponent } from './query-sub-cat/query-sub-cat.component';
import { QuerySubCat2Component } from './query-sub-cat2/query-sub-cat2.component';
import { BarcodeComponent } from './barcode/barcode.component';
import { AssetPlantComponent } from '../page/add-asset/asset-plant/asset-plant.component';
import { FloorComponent } from './floor/floor.component';
import { LocationComponent } from './location/location.component';
import { DeviceGroupComponent } from './device-group/device-group.component';
import { BuildingComponent } from './building/building.component';
import { PhotoViewComponent } from './photo-view/photo-view.component';
import { VideoComponent } from './video/video.component';
import { CaptureComponent } from './capture/capture.component';
import { TimesPipe } from '../pipes/times.pipe';
import { VideoPlayComponent } from './video-play/video-play.component';
import { BlockComponent } from './block/block.component';
import { ImageViewComponent } from './image-view/image-view.component';
import { PdfViewComponent } from './pdf-view/pdf-view.component';
import { PdfViewerModule } from 'ng2-pdf-viewer';
@NgModule({
  declarations: [
    SignatureComponent,
    CameraComponent,
    CostCenterComponent,
    QueryCatComponent,
    QuerySubCatComponent,
    QuerySubCat2Component,
    BarcodeComponent,
    AssetPlantComponent,
    FloorComponent,
    LocationComponent,
    DeviceGroupComponent,
    BuildingComponent,
    PhotoViewComponent,
    VideoComponent,
    CaptureComponent,
    TimesPipe,
    VideoPlayComponent,
    BlockComponent,
    ImageViewComponent,
    PdfViewComponent

  ],
  imports: [
    CommonModule,
    SignaturePadModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    PdfViewerModule
  ],
  entryComponents: [
    SignatureComponent,
    CameraComponent,
    CostCenterComponent,
    QueryCatComponent,
    QuerySubCatComponent,
    QuerySubCat2Component,
    BarcodeComponent,
    AssetPlantComponent,
    FloorComponent,
    LocationComponent,
    DeviceGroupComponent,
    BuildingComponent,
    PhotoViewComponent,
    VideoComponent,
    CaptureComponent,
    VideoPlayComponent,
    BlockComponent,
    ImageViewComponent,
    PdfViewComponent
  ],
  exports: [
    VideoComponent,
    TimesPipe,
    VideoPlayComponent
  ]
})
export class SharedModule { }
