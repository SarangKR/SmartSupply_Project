import numpy as np

Z_SCORE_95 = 1.65


def calculate_safety_stock(std_dev_sales, avg_lead_time):
    safety_stock = Z_SCORE_95 * std_dev_sales * np.sqrt(avg_lead_time)
    return round(safety_stock, 0)


def calculate_reorder_point(avg_daily_sales, lead_time, safety_stock):

    demand_during_lead_time = avg_daily_sales * lead_time
    rop = demand_during_lead_time + safety_stock
    return round(rop, 0)


def calculate_eoq(annual_demand, ordering_cost, holding_cost):

    if holding_cost == 0:
        return 0

    numerator = 2 * annual_demand * ordering_cost
    eoq = np.sqrt(numerator / holding_cost)
    return round(eoq, 0)


if __name__ == "__main__":
    print("- Testing Inventory Logic -")

    test_std_dev = 5
    test_lead_time = 7
    test_avg_sales = 50

    ss = calculate_safety_stock(test_std_dev, test_lead_time)
    print(f"Safety Stock needed: {ss} units")


    rop = calculate_reorder_point(test_avg_sales, test_lead_time, ss)
    print(f"Reorder Point: {rop} units")

    print("Test Complete!")