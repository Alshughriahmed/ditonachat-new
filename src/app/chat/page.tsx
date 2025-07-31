"use client";

/*
 * This page implements a simple one‑to‑one video chat using the WebRTC API
 * for peer‑to‑peer media transport and Socket.IO for the signalling layer.
 *
 * The original implementation suffered from a race condition in which the
 * remote video element never received a stream.  The core problem was
 * that tracks were added to the RTCPeerConnection after an offer had
 * already been generated.  According to the WebRTC specification, the
 * current set of media tracks is encoded into the SDP offer, therefore
 * any tracks that are not present at the moment of calling
 * `createOffer()` will not be negotiated:contentReference[oaicite:5]{index=5}.  The
 * recommended approach is to obtain the local media stream and add
 * **all** of its tracks to the peer connection **before** starting
 * signalling:contentReference[oaicite:6]{index=6}.  Additionally, a `track` event
 * handler must be installed on the peer connection to assign incoming
 * streams to the remote video element:contentReference[oaicite:7]{index=7}.
 *
 * The implementation below follows these recommendations.  It builds
 * the peer connection once the component mounts, adds the local
 * tracks immediately, and wires up detailed logging for every
 * signalling and WebRTC event.  Console messages include
 * RTCPeerConnection creation, track addition, ICE candidate
 * generation/handling, and offer/answer exchange.  These logs make it
 * easier to follow the negotiation flow during development and to
 * diagnose issues should the remote video remain black.
 */

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

// Adjust this constant to point at your deployed signalling server.  In
// many deployments you may prefer to load this from an environment
// variable (e.g. process.env.NEXT_PUBLIC_SIGNALING_URL) instead of
// hard‑coding a URL here.  The client will connect over WebSocket.
const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "";

// Define a basic STUN server list.  Without at least one STUN server
// most browsers will be unable to discover their public IP address and
// the peer connection may fail for clients behind NATs or firewalls.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
  ],
};

export default function ChatPage() {
  // Refs to DOM elements for the local and remote video elements.
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Refs to hold the peer connection, the signalling socket and the
  // local media stream.  Using refs avoids unnecessary re‑renders when
  // these objects are updated and allows them to be accessed from
  // within callbacks.
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Perform all asynchronous initialisation inside an inner async
    // function so that we can use await within useEffect.
    const start = async () => {
      try {
        // Acquire the local media stream (camera and microphone).
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        console.log("Local media stream obtained", localStream);
        localStreamRef.current = localStream;

        // Display the local stream in the self‑view video element.  It
        // is important to set `muted` on this element in JSX (see
        // return statement) to avoid audio feedback.
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Create a new RTCPeerConnection using our ICE server list and
        // assign it to the ref.  Note: in a production application you
        // may want to pass additional configuration here.
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;
        console.log("RTCPeerConnection created", pc);

        // Add **all** tracks from the local stream to the peer connection
        // before creating any offer.  This ensures that the tracks are
        // negotiated correctly:contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}.
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
          console.log("Added local track to peer connection", track);
        });

        // When a remote track is received, the `track` event fires.  Assign
        // the remote stream to the remote video element only once to
        // preserve existing video when multiple tracks are added:contentReference[oaicite:10]{index=10}.
        pc.ontrack = (event: RTCTrackEvent) => {
          console.log("ontrack event: streams=", event.streams);
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && remoteStream) {
            // Only set the srcObject if not already set to avoid
            // resetting the video when additional tracks arrive.
            if (remoteVideoRef.current.srcObject !== remoteStream) {
              remoteVideoRef.current.srcObject = remoteStream;
              console.log("Remote stream attached to video element");
            }
          }
        };

        // ICE candidate gathering: whenever the browser finds a
        // candidate, send it to the other peer through the signalling
        // channel.  If there is no candidate, the event will fire with
        // `event.candidate` equal to null to signal the end of the
        // gathering process.
        pc.onicecandidate = (event) => {
          console.log("onicecandidate event", event.candidate);
          const candidate = event.candidate;
          if (candidate && socketRef.current) {
            socketRef.current.emit("ice-candidate", candidate);
            console.log("Sent ICE candidate to signalling server", candidate);
          }
        };

        // Connect to the signalling server using Socket.IO.  We only
        // create one socket connection for the lifetime of the page.  If
        // SIGNALING_SERVER_URL is empty, Socket.IO will attempt to
        // connect to the origin that served the page.
        const socket = io(SIGNALING_SERVER_URL, {
          autoConnect: true,
        });
        socketRef.current = socket;

        // Confirm the connection.  At this point your server may ask the
        // client to join a room.  You can emit such events here as
        // appropriate for your signalling server implementation.
        socket.on("connect", () => {
          console.log("Connected to signalling server with id", socket.id);
          // Example: tell the server we are ready to be matched with a partner.
          socket.emit("ready");
        });

        // When the server notifies us that a partner is available, we
        // decide whether to initiate the call or wait to answer.  The
        // server should send a flag (e.g. isInitiator) so the peers do
        // not both attempt to create an offer at the same time.
        socket.on("partner", async (data: { isInitiator?: boolean }) => {
          console.log("Received partner event", data);
          if (!pcRef.current) return;
          // If this client is designated as the initiator, create an offer
          // immediately.  Otherwise, wait for the offer from the other
          // peer.  Without this check the clients could end up in glare.
          if (data?.isInitiator) {
            try {
              console.log("Creating SDP offer…");
              const offer = await pc.createOffer();
              console.log("Created offer", offer);
              await pc.setLocalDescription(offer);
              console.log("Set local description with offer");
              // Send the offer through the signalling server so the other
              // peer can set it as their remote description.
              socket.emit("offer", offer);
              console.log("Sent offer to signalling server");
            } catch (err) {
              console.error("Failed to create or send offer", err);
            }
          }
        });

        // Handle incoming offers from the signalling server.  We set the
        // remote description, create an answer, set it locally and then
        // send it back to the caller.
        socket.on("offer", async (offer: RTCSessionDescriptionInit) => {
          console.log("Received offer", offer);
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log("Set remote description with offer");
            const answer = await pc.createAnswer();
            console.log("Created answer", answer);
            await pc.setLocalDescription(answer);
            console.log("Set local description with answer");
            socket.emit("answer", answer);
            console.log("Sent answer to signalling server");
          } catch (err) {
            console.error("Error handling received offer", err);
          }
        });

        // Handle incoming answers from the signalling server.  Once we
        // receive the answer, we set it as the remote description to
        // complete the offer/answer exchange.
        socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
          console.log("Received answer", answer);
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("Set remote description with answer");
          } catch (err) {
            console.error("Error setting remote description from answer", err);
          }
        });

        // Handle incoming ICE candidates from the signalling server.  These
        // candidates originate from the remote peer.  Each one must be
        // added to the peer connection so that ICE can succeed.
        socket.on(
          "ice-candidate",
          async (candidate: RTCIceCandidateInit) => {
            console.log(
              "Received ICE candidate from signalling server",
              candidate,
            );
            const pc = pcRef.current;
            if (!pc || !candidate) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("Added ICE candidate to peer connection");
            } catch (err) {
              console.error("Error adding received ICE candidate", err);
            }
          },
        );
      } catch (err) {
        console.error("Error during WebRTC initialisation", err);
      }
    };

    start();

    // Clean up resources when the component unmounts.  This stops the
    // media tracks, closes the peer connection and disconnects the socket.
    return () => {
      // Stop local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        console.log("Stopped local media tracks");
      }
      // Close the peer connection
      if (pcRef.current) {
        pcRef.current.close();
        console.log("Closed RTCPeerConnection");
      }
      // Disconnect from the signalling server
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("Disconnected from signalling server");
      }
    };
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gray-900">
      {/* Remote video occupies the majority of the area.  The class names
          here use TailwindCSS to provide a dark background and ensure the
          video scales to fit the container. */}
      <video
        ref={remoteVideoRef}
        className="h-full w-full rounded-md bg-black"
        autoPlay
        playsInline
      />
      {/* Local video appears as a small picture‑in‑picture overlay in
          the bottom right corner.  Muting prevents acoustic feedback. */}
      <video
        ref={localVideoRef}
        className="absolute bottom-4 right-4 h-32 w-40 rounded-md border border-white bg-black"
        autoPlay
        playsInline
        muted
      />
    </div>
  );
}
