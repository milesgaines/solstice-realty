//
//  CameraView.swift
//  BeMeh
//
//  Real front-camera capture for the guided scan: an AVCaptureSession feeding
//  a preview layer, with photo capture on the shutter. Falls back gracefully
//  when permission is denied or no camera exists (e.g. the simulator).
//

import AVFoundation
import SwiftUI
import UIKit

final class CameraController: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
    enum Status { case unknown, denied, unavailable, running }

    @Published var status: Status = .unknown

    let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private let queue = DispatchQueue(label: "com.bemehesthetics.camera")
    private var onCapture: (() -> Void)?

    func start() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configure()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted { self?.configure() } else { self?.status = .denied }
                }
            }
        default:
            status = .denied
        }
    }

    private func configure() {
        queue.async { [self] in
            if !session.inputs.isEmpty {
                if !session.isRunning { session.startRunning() }
                DispatchQueue.main.async { self.status = .running }
                return
            }
            session.beginConfiguration()
            session.sessionPreset = .photo
            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                       for: .video, position: .front),
                  let input = try? AVCaptureDeviceInput(device: device),
                  session.canAddInput(input),
                  session.canAddOutput(output)
            else {
                session.commitConfiguration()
                DispatchQueue.main.async { self.status = .unavailable }
                return
            }
            session.addInput(input)
            session.addOutput(output)
            session.commitConfiguration()
            session.startRunning()
            DispatchQueue.main.async { self.status = .running }
        }
    }

    func stop() {
        queue.async { [self] in
            if session.isRunning { session.stopRunning() }
        }
    }

    /// Take a real photo if the camera is live; otherwise just advance the flow.
    func capture(_ done: @escaping () -> Void) {
        guard status == .running else { done(); return }
        onCapture = done
        output.capturePhoto(with: AVCapturePhotoSettings(), delegate: self)
    }

    func photoOutput(_ output: AVCapturePhotoOutput,
                     didFinishProcessingPhoto photo: AVCapturePhoto,
                     error: Error?) {
        DispatchQueue.main.async {
            self.onCapture?()
            self.onCapture = nil
        }
    }
}

/// SwiftUI wrapper for the live camera feed.
struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer {
            layer as! AVCaptureVideoPreviewLayer
        }
    }

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {}
}
