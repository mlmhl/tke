import axios from 'axios';

interface ResultData {
  pod_dashboard_url: string;
  project_dashboard_url: string;
  workload_dashboard_url: string;
  platform_workload_dashboard_url: string;
  platform_pod_dashboard_url: string;
}

interface Result {
  data: ResultData;
}

export async function fetchGrafanaURLs() {
  const result: Result = await axios('/web-api/grafana/urls');
  return result.data;
}
