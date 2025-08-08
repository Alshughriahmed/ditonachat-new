// src/utils/rtcClient.ts
'use client';

import { io, Socket } from 'socket.io-client';

type Cfg = {
  socketUrl: string;
  roomId: string;
  localEl: HTMLVideoElement;
  remoteEl: HTMLVideoElement;
};

export class RTCClient {
  private pc: RTCPeerConnection | null = null;
  private socket: Socket | null = null;
  private roomId = '';
  private localStream: MediaStream | null = null;

  async start({ socketUrl, roomId, localEl, remoteEl }: Cfg) {
    this.roomId = roomId;

    // 1) socket
    this.socket = io(socketUrl, { path: '/api/socket', reconnection: true });
    await new Promise<void>((resolve) => {
      if (!this.socket) return resolve();
      this.socket.on('connect', () => resolve());
    });

    // 2) media
    // ملاحظة: على الموبايل عبر HTTP قد تُرفض. جرّب من كمبيوترين أولاً.
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localEl.srcObject = this.localStream;
    localEl.muted = true;
    await localEl.play().catch(() => {});

    // 3) RTCPeerConnection
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });

    // أرسل أي ICE جديد للطرف الآخر
    this.pc.onicecandidate = (ev) => {
      if (ev.candidate && this.socket) {
        this.socket.emit('rtc:signal', this.roomId, { type: 'candidate', candidate: ev.candidate });
      }
    };

    // عند وصول مسار الفيديو للطرف الآخر
    this.pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (stream) {
        remoteEl.srcObject = stream;
        remoteEl.play().catch(() => {});
      }
    };

    // أضف مساراتك المحلية
    this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));

    // 4) signaling handlers
    this.socket!.on('rtc:signal', async ({ from, payload }) => {
      if (!this.pc) return;
      if (payload.type === 'offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.socket!.emit('rtc:signal', this.roomId, { type: 'answer', sdp: this.pc.localDescription });
      } else if (payload.type === 'answer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload.type === 'candidate') {
        try {
          await this.pc.addIceCandidate(payload.candidate);
        } catch {}
      }
    });

    // 5) انضم للغرفة ثم قرّر من يبدأ العرض
    this.socket!.emit('rtc:join', this.roomId);
    // نستخدم قاعدة بسيطة: أول من ينشئ offer هو الذي يبدأ أولاً
    // لتبسيط، دائمًا ابدا بعرض offer بعد 300ms (لو الطرف الآخر سبقك سيعالجها)
    setTimeout(async () => {
      if (!this.pc) return;
      const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await this.pc.setLocalDescription(offer);
      this.socket!.emit('rtc:signal', this.roomId, { type: 'offer', sdp: this.pc.localDescription });
    }, 300);
  }

  async stop() {
    try { this.socket?.emit('rtc:leave', this.roomId); } catch {}
    try { this.socket?.disconnect(); } catch {}
    this.socket = null;

    if (this.pc) {
      this.pc.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} });
      try { this.pc.close(); } catch {}
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }
}
