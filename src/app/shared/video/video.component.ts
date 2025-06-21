import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss'],
})
export class VideoComponent {
  @Input() ticket_id: any;
  isLoading!: boolean;
  title = 'ApiRTC-angular';
  @ViewChild("localVideo") videoRef!: ElementRef;
  @ViewChild("remoteVideo") remVideoRef!: ElementRef;
  conversationFormGroup = this.fb.group({
    name: this.fb.control('', [Validators.required])
  });

  get conversationNameFc(): FormControl {
    return this.conversationFormGroup.get('name') as FormControl;
  }
  conversation: any;
  remotesCounter = 0;
  isProcess!: boolean;
  stream: any;
  userAgent: any;
  constructor(
    private fb: FormBuilder
  ) { }

  getOrcreateConversation(facingMode: string) {
    this.isProcess = true;
    var localStream: any = null;
    //==============================
    // 1/ CREATE USER AGENT
    //==============================
    // this.userAgent = new UserAgent({
    //   uri: 'apiKey:b8e1d5d1d9a57da28c0c72ca378211d6'
    // });
    //==============================
    // 2/ REGISTER
    //==============================

    // this.userAgent.register().then((session: Session) => {
    //   //==============================
    //   // 3/ CREATE CONVERSATION
    //   //==============================
    //   // const conversation: Conversation = session.getConversation(this.ticket_id);
    //   // this.conversation = conversation;
    //   // //==========================================================
    //   // // 4/ ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
    //   // //==========================================================
    //   // conversation.on('streamListChanged', (streamInfo: any) => {
    //   //   console.log("streamListChanged :", streamInfo);
    //   //   if (streamInfo.listEventType === 'added') {
    //   //     if (streamInfo.isRemote === true) {
    //   //       conversation.subscribeToMedia(streamInfo.streamId)
    //   //         .then((stream: Stream) => {
    //   //           console.log('subscribeToMedia success', stream);
    //   //         }).catch((err: any) => {
    //   //           console.error('subscribeToMedia error', err);
    //   //         });
    //   //     }
    //   //   }
    //   // });
    //   //=====================================================
    //   // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED TO/FROM THE CONVERSATION
    //   //=====================================================
    //   conversation.on('streamAdded', (stream: Stream) => {
    //     this.remotesCounter += 1;
    //     stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
    //   }).on('streamRemoved', (stream: any) => {
    //     this.remotesCounter -= 1;
    //     stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
    //   });
    //   //==============================
    //   // 5/ CREATE LOCAL STREAM
    //   //==============================
    //   this.userAgent.createStream({
    //     constraints: {
    //       audio: true,
    //       video: {
    //         facingMode: {
    //           ideal: facingMode
    //         }
    //       },
    //     }
    //   }).then((stream: Stream) => {
    //       console.log('createStream :', stream);
    //       // Save local stream
    //       localStream = stream;
    //       this.stream = stream;
    //       // Display stream
    //       this.videoRef.nativeElement.muted = true;
    //       localStream.attachToElement(this.videoRef.nativeElement);
    //       //==============================
    //       // 6/ JOIN CONVERSATION
    //       //==============================
    //       conversation.join().then(() => {
    //           //==============================
    //           // 7/ PUBLISH LOCAL STREAM
    //           //==============================
    //           conversation.publish(localStream).then((stream: Stream) => {
    //             console.log('published', stream);
    //             this.isProcess = false;
    //             // setTimeout(() => {
    //             //   userAgent.unregister().then(res => {
    //             //     this.LeaveCall();
    //             //   })
    //             // }, 10000);
    //           }).catch((err: any) => {
    //             console.error('publish error', err);
    //           });
    //         }).catch((err: any) => {
    //           console.error('Conversation join error', err);
    //         });
    //     }).catch((err: any) => {
    //       console.error('create stream error', err);
    //     });
    // }, (err: any) => {
    //   console.log('Err User Register');
    //   console.log(err);
    // });
  }

  LeaveCall() {
    if (this.conversation !== null) {
      // Leaving actual conversation
      this.userAgent.unregister().then((res: any) => {
        this.conversation.leave().then(() => {
          console.debug('Conversation leave OK');
          this.conversation.destroy();
          this.conversation = null;
          this.stream.release();
        }).catch((err: any) =>  {
          console.error('Conversation leave error', err);
        });
      })
    }
  }

  flipCamera() {
    this.userAgent.unregister().then((res: any) => {
      this.conversation.leave().then(() => {
        this.conversation.destroy();
        this.conversation = null;
        this.stream.release();
        this.getOrcreateConversation('user');
      });
    })
  }
}
