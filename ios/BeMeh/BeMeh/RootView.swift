//
//  RootView.swift
//  BeMeh
//

import SwiftUI
import UIKit

struct RootView: View {
    @StateObject private var state = AppState()

    init() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(red: 0.094, green: 0.071, blue: 0.035, alpha: 1)
        appearance.shadowColor = UIColor(white: 1, alpha: 0.10)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some View {
        Group {
            if state.isSignedUp {
                mainTabs
            } else {
                SignUpView()
            }
        }
        .environmentObject(state)
        .preferredColorScheme(.dark)
    }

    private var mainTabs: some View {
        TabView(selection: $state.tab) {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.horizon") }
                .tag(Tab.today)

            ScanView()
                .tabItem { Label("Scan", systemImage: "viewfinder") }
                .tag(Tab.scan)

            BookView()
                .tabItem { Label("Book", systemImage: "calendar") }
                .tag(Tab.book)

            RegimenView()
                .tabItem { Label("Regimen", systemImage: "list.bullet") }
                .tag(Tab.regimen)
        }
        .tint(Palette.gold)
        .fullScreenCover(item: $state.activeMeeting) { meeting in
            SessionView(meeting: meeting).environmentObject(state)
        }
    }
}

struct RootView_Previews: PreviewProvider {
    static var previews: some View { RootView() }
}
