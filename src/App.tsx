import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineBanner } from './components/OfflineBanner'
import { I18nProvider } from './i18n/context'
import VDLFlowApp from './VDLFlowApp'

export default function App() {
  return (
    <I18nProvider>
      <ErrorBoundary>
        <OfflineBanner />
        <VDLFlowApp />
      </ErrorBoundary>
    </I18nProvider>
  )
}
