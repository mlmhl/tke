import { QueryState } from '@/lib/ff-redux';
import { RequestParams, ResourceInfo } from '@src/modules/common';
import { resourceConfig } from '@/config';
import { Method, reduceK8sRestfulPath, reduceNetworkRequest } from '@/helpers';

export async function fetchUserId(query: QueryState<string>) {
  let infoResourceInfo: ResourceInfo = resourceConfig()['info'];
  let url = reduceK8sRestfulPath({ resourceInfo: infoResourceInfo });
  let params: RequestParams = {
    method: Method.get,
    url
  };
  let result;
  try {
    let response = await reduceNetworkRequest(params);
    result = response.data;
  } catch (error) {}

  return result;
}
