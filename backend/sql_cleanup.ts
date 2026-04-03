import pg from "npm:pg";
const { Client } = pg;

async function cleanup() {
  const client = new Client("postgres://teamuser:teampass@localhost:5432/teammanagement");
  try {
    await client.connect();
    console.log("Connected to DB.");

    // Delete one of the duplicate APPROVED sickleaverequests for employee 3 on 2026-04-03
    const findRes = await client.query(
      "SELECT id FROM leave_requests WHERE employee_id = 3 AND start_date = $1 AND status = $2 ORDER BY created_at DESC", 
      ["2026-04-03", "APPROVED"]
    );

    if (findRes.rows.length > 1) {
      const duplicateId = findRes.rows[0].id;
      await client.query("DELETE FROM leave_requests WHERE id = $1", [duplicateId]);
      await client.query("UPDATE leave_balances SET used_leaves = used_leaves - 1 WHERE employee_id = 3 AND year = 2026");
      console.log(`Deleted duplicate APPROVED request ID: ${duplicateId} and corrected balance.`);
    } else {
      console.log("No duplicates found to delete.");
    }

  } catch (err) {
    console.error("Cleanup error:", err);
  } finally {
    await client.end();
  }
}

cleanup();
