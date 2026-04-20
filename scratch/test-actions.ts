import { getDashboardKPIs, getSalesChartData, getTopProducts, getCategoryDistribution, getRecentMovements } from "../src/actions/dashboard.actions";

async function runTests() {
  console.log("Testing getDashboardKPIs...");
  try {
    const res = await getDashboardKPIs();
    console.log("Result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("FAILED:", err);
  }

  console.log("\nTesting getSalesChartData...");
  try {
    const res = await getSalesChartData();
    console.log("Result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("FAILED:", err);
  }
}

runTests();
