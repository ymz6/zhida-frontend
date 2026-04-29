import type { GetAppQueryResult } from '@/api/generated/endpoints/app'

export interface DeployResult {
  deployUrl?: string
  deployStatus?: string
  deployedAt?: string
}

export function openExternalUrl(url: string | undefined) {
  if (url) {
    window.open(url, '_blank', 'noreferrer')
  }
}

export function updateAppDetailDeployResult(
  oldData: GetAppQueryResult | undefined,
  deployResult: DeployResult,
) {
  if (!oldData?.data) {
    return oldData
  }

  return {
    ...oldData,
    data: {
      ...oldData.data,
      deployStatus: deployResult.deployStatus ?? oldData.data.deployStatus,
      deployUrl: deployResult.deployUrl ?? oldData.data.deployUrl,
      deployedAt: deployResult.deployedAt ?? oldData.data.deployedAt,
      deployErrorMessage: undefined,
    },
  }
}
