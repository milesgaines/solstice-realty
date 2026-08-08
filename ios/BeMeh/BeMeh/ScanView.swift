//
//  ScanView.swift
//  BeMeh
//
//  Guided three-angle capture over the real front camera (see CameraView.swift).
//  If the camera is unavailable or permission is denied, the guide overlay still
//  works so the flow is never a dead end.
//

import SwiftUI
import UIKit

struct ScanView: View {
    @EnvironmentObject private var state: AppState
    @StateObject private var camera = CameraController()
    @State private var angle = 0
    @State private var finished = false
    @State private var sweep = false

    private let prompts = ["Look straight ahead", "Turn slightly left", "Turn slightly right"]

    var body: some View {
        ZStack {
            viewfinder

            VStack(spacing: 0) {
                VStack(spacing: 2) {
                    Text("Angle \(min(angle + 1, 3)) of 3").eyebrowStyle()
                    Text(finished ? "Captured" : prompts[min(angle, 2)])
                        .font(.display(24))
                        .foregroundStyle(Palette.ink)
                }
                .padding(.top, 12)

                Spacer()

                if camera.status == .denied { permissionCard.padding(.horizontal, 18) }
                lightingCard
                    .padding(.horizontal, 18)

                dots
                    .padding(.top, 22)

                shutter
                    .padding(.top, 14)
                    .padding(.bottom, 12)
            }
        }
        .onAppear { sweep = true; camera.start() }
        .onDisappear { camera.stop() }
        .sheet(isPresented: $finished, onDismiss: reset) {
            ScanResultSheet()
                .presentationDetents([.medium])
                .modifier(SheetGround())
        }
    }

    private var viewfinder: some View {
        ZStack {
            // Live camera when available, warm gradient otherwise.
            if camera.status == .running {
                CameraPreview(session: camera.session)
                    .ignoresSafeArea()
                    .overlay(Color.black.opacity(0.15).ignoresSafeArea())
            } else {
                RadialGradient(
                    colors: [Color(red: 0.29, green: 0.22, blue: 0.15), Palette.ground],
                    center: .init(x: 0.5, y: 0.4), startRadius: 20, endRadius: 380
                )
                .ignoresSafeArea()
            }

            GeometryReader { geo in
                let w = geo.size.width * 0.58
                let h = w / 0.76

                Ellipse()
                    .strokeBorder(Palette.gold.opacity(0.75),
                                  style: StrokeStyle(lineWidth: 1.5, dash: [6, 6]))
                    .frame(width: w, height: h)
                    .position(x: geo.size.width / 2, y: geo.size.height * 0.42)

                Rectangle()
                    .fill(LinearGradient(colors: [.clear, Palette.gold, .clear],
                                         startPoint: .leading, endPoint: .trailing))
                    .frame(height: 2)
                    .padding(.horizontal, geo.size.width * 0.14)
                    .position(x: geo.size.width / 2,
                              y: geo.size.height * (sweep ? 0.58 : 0.26))
                    .animation(
                        .easeInOut(duration: 3.2).repeatForever(autoreverses: true),
                        value: sweep
                    )

                CornerBrackets()
                    .stroke(Palette.gold, lineWidth: 2)
                    .frame(width: geo.size.width * 0.74, height: h * 1.1)
                    .position(x: geo.size.width / 2, y: geo.size.height * 0.42)
            }
        }
    }

    private var permissionCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 6) {
                Text("Camera access is off")
                    .font(.label(14))
                    .foregroundStyle(Palette.ink)
                Text("Turn it on in Settings › BeMeh to scan with the live camera. You can still walk the guided steps below.")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkDim)
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(GhostButtonStyle())
                .padding(.top, 2)
            }
        }
    }

    private var lightingCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Lighting")
                        .font(.label(13))
                        .foregroundStyle(Palette.ink)
                    Spacer()
                    Pill(text: "Normalized", tone: .good)
                }
                ProgressView(value: 0.86)
                    .tint(Palette.gold)
                Text("Warm indoor light detected — colors corrected to match your \(state.reading.capturedOn) scan.")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkDim)
            }
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var dots: some View {
        HStack(spacing: 7) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(i < angle ? Palette.gold : Palette.ink.opacity(0.28))
                    .frame(width: 7, height: 7)
            }
        }
    }

    private var shutter: some View {
        Button(action: capture) {
            ZStack {
                Circle().strokeBorder(Palette.ink.opacity(0.9), lineWidth: 3)
                Circle().fill(Palette.goldFill).padding(6)
            }
            .frame(width: 66, height: 66)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Capture angle \(min(angle + 1, 3)) of 3")
    }

    private func capture() {
        guard !finished else { return }
        // Take the real photo (if the camera is live), then advance the flow.
        camera.capture {
            withAnimation(.easeOut(duration: 0.25)) {
                angle += 1
            }
            if angle >= 3 {
                Haptic.success()
                state.completeScan()
                finished = true
            } else {
                Haptic.soft()
            }
        }
    }

    private func reset() {
        angle = 0
    }
}

/// Four camera-style corner marks around the capture area.
struct CornerBrackets: Shape {
    var arm: CGFloat = 22

    func path(in rect: CGRect) -> Path {
        var p = Path()
        // top-left
        p.move(to: CGPoint(x: rect.minX, y: rect.minY + arm))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.minX + arm, y: rect.minY))
        // top-right
        p.move(to: CGPoint(x: rect.maxX - arm, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + arm))
        // bottom-right
        p.move(to: CGPoint(x: rect.maxX, y: rect.maxY - arm))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.maxX - arm, y: rect.maxY))
        // bottom-left
        p.move(to: CGPoint(x: rect.minX + arm, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - arm))
        return p
    }
}

struct ScanResultSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Scan complete").eyebrowStyle()
            Text(state.reading.headline)
                .font(.display(30))
                .foregroundStyle(Palette.ink)

            HStack(spacing: 16) {
                RingGauge(value: state.reading.index, size: 88)
                Text(state.reading.detail)
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkDim)
            }

            Text("Your esthetician sees this before the call starts.")
                .font(.footnote)
                .foregroundStyle(Palette.inkDim)

            Spacer()

            Button("Done") { dismiss() }
                .buttonStyle(GoldButtonStyle(wide: true))
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// `presentationBackground` is iOS 16.4+. On 16.0–16.3 the sheet keeps the
/// system material, which still reads correctly against the dark palette.
private struct SheetGround: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
        if #available(iOS 16.4, *) {
            content.presentationBackground(Palette.ground)
        } else {
            content
        }
    }
}

struct ScanView_Previews: PreviewProvider {
    static var previews: some View { ScanView().environmentObject(AppState()) }
}
