//
//  SessionView.swift
//  BeMeh
//
//  The live consult, "Zoom-style". The self-view is a real live front-camera
//  feed (see CameraView.swift). The remote esthetician tile is a placeholder:
//  a true two-way call needs a media server (LiveKit/Twilio/WebRTC), which this
//  build doesn't include — the plumbing for that lands where noted below.
//

import Combine
import SwiftUI

struct SessionView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var camera = CameraController()

    @State private var elapsed = 724   // 12:04, so the demo opens mid-call
    @State private var revealed = 0
    @State private var cameraOn = true

    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var clock: String {
        String(format: "%d:%02d", elapsed / 60, elapsed % 60)
    }

    var body: some View {
        ZStack {
            // Remote stage: the esthetician. Placeholder until a media server is
            // wired in — a warm ground with the pro's monogram.
            LinearGradient(colors: [Color(red: 0.28, green: 0.21, blue: 0.14), Palette.ground],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            VStack(spacing: 12) {
                Monogram(letter: state.upcoming.pro.initial, size: 96)
                Text(state.upcoming.pro.displayName)
                    .font(.display(24))
                    .foregroundStyle(Palette.ink)
                Text("Connected · audio live")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkDim)
            }

            GeometryReader { geo in
                ForEach(Array(state.sessionNotes.enumerated()), id: \.element.id) { i, note in
                    if i < revealed {
                        Circle()
                            .strokeBorder(Palette.copper, lineWidth: 1.5)
                            .background(Circle().fill(Palette.copper.opacity(0.10)))
                            .frame(width: 30, height: 30)
                            .position(x: geo.size.width * note.x, y: geo.size.height * note.y)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
            }

            VStack(spacing: 0) {
                HStack(alignment: .top) {
                    Pill(text: "Live · \(clock)", tone: .live)
                    Spacer()
                    selfView
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)

                Spacer()

                noteCard
                    .padding(.horizontal, 18)

                controls
                    .padding(.top, 20)
                    .padding(.bottom, 10)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear { camera.start() }
        .onDisappear { camera.stop() }
        .onReceive(tick) { _ in
            elapsed += 1
            if revealed < state.sessionNotes.count && elapsed % 3 == 0 {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                    revealed += 1
                }
            }
        }
    }

    /// The live self-view tile — real front camera when running.
    private var selfView: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(Palette.liftFill)
            .frame(width: 96, height: 128)
            .overlay {
                if cameraOn && camera.status == .running {
                    CameraPreview(session: camera.session)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Palette.gold.opacity(0.4), lineWidth: 1)
            }
            .overlay(alignment: .bottom) {
                Text(cameraOn ? "You" : "Camera off")
                    .font(.label(9))
                    .foregroundStyle(Palette.ink)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Capsule().fill(.black.opacity(0.4)))
                    .padding(.bottom, 6)
            }
            .shadow(color: .black.opacity(0.4), radius: 8, y: 4)
    }

    /// "Renée marked 3 areas on your scan", with the count struck in gold.
    private var markedSummary: Text {
        let lead = Text("\(state.upcoming.pro.name) marked ")
            .font(.footnote)
            .foregroundStyle(Palette.ink)
        let count = Text("\(revealed) area\(revealed == 1 ? "" : "s")")
            .font(.label(13))
            .foregroundStyle(Palette.gold)
        let tail = Text(" on your scan")
            .font(.footnote)
            .foregroundStyle(Palette.ink)
        return lead + count + tail
    }

    private var noteCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    Monogram(letter: state.upcoming.pro.initial, size: 28)
                    markedSummary
                    Spacer(minLength: 0)
                }

                if let latest = state.sessionNotes.prefix(max(revealed, 1)).last {
                    Text("\u{201C}\(latest.note)\u{201D} — \(latest.area)")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkDim)
                }

                Button(state.savedMap ? "Saved to your map" : "Save to my map") {
                    state.savedMap = true
                }
                .buttonStyle(GhostButtonStyle(wide: true))
                .disabled(state.savedMap)
            }
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    @State private var muted = false

    private var controls: some View {
        HStack(spacing: 16) {
            circleButton(system: muted ? "mic.slash.fill" : "mic.fill",
                         label: muted ? "Unmute" : "Mute") {
                Haptic.tap(); muted.toggle()
            }
            circleButton(system: cameraOn ? "video.fill" : "video.slash.fill",
                         label: cameraOn ? "Turn camera off" : "Turn camera on") {
                Haptic.tap()
                cameraOn.toggle()
                if cameraOn { camera.start() } else { camera.stop() }
            }
            circleButton(system: "xmark", label: "End call", destructive: true) {
                Haptic.soft()
                camera.stop()
                state.isInSession = false
                dismiss()
            }
        }
    }

    private func circleButton(system: String,
                              label: String,
                              destructive: Bool = false,
                              action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: system)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .frame(width: 50, height: 50)
                .background {
                    Circle().fill(destructive
                                  ? Color(red: 0.69, green: 0.32, blue: 0.23)
                                  : Palette.ink.opacity(0.14))
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

#Preview {
    SessionView().environmentObject(AppState())
}
