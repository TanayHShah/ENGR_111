import pandas as pd
from datetime import datetime
from pandasgui import show
from scipy.signal import butter, filtfilt, resample
from scipy import stats
import time
import tkinter as tk
from tkinter import filedialog, scrolledtext,messagebox
import json
import re
import sys

bs_outlier = 20
bs_water = 30
bs_datacount = 50

# Filter requirements.
T = 5.0  # Sample Period
cutoff = 2  # desired cutoff frequency of the filter, Hz ,      slightly higher than actual 1.2 Hz

fs = 30  # sample rate, Hz
cutoff = 2  # desired cutoff frequency of the filter, Hz ,      slightly higher than actual 1.2 Hz
nyq = 0.5 * fs  # Nyquist Frequency
order = 3


def butter_lowpass_filter(data, cutoff, fs, order):
    normal_cutoff = cutoff / nyq
    # Get the filter coefficients
    b, a = butter(order, normal_cutoff, btype="low", analog=False)
    y = filtfilt(b, a, data)
    return y



def validate_input(char, entry_value):
    # Allow only numeric input
    return char.isdigit() or entry_value == ""

def show_error_message():
    messagebox.showerror("Error", "This is an error message!")


   

selected_file_path =  sys.argv[1]
compare_file_path = None
standard_input = 0
data = {}


def process_selected_file():
    global data
    with open(selected_file_path) as my_file:
        lines = [line for line in my_file]

    topic = lines[0][7:].replace("\n", "")
    Date_range = lines[1][11:].replace("\n", "")
    col = lines[3].replace(" ", "").replace("\n", "").split("|") + [
        "linuxtime",
        "interval",
        "time",
    ]

    df = pd.DataFrame(columns=col)
    date_format = "%d %b %Y %H:%M:%S"
    intv = 0
    add_time = 0

    for i in lines[5:]:
        temp = i.split("|")
    
        temp_var = (temp[0])  # Try converting temp[0] to float
        if not temp_var.strip().replace('.', '', 1).isdigit():  # Check if it's an integer
            temp[0] = 0
        date = temp[1][1:].replace("\n", "")
        date = datetime.strptime(date, date_format)
        linuxtime = time.mktime(date.timetuple())

        if intv == 0:
            df_add = pd.DataFrame([[float(temp[0]), date, linuxtime, 0, 0]], columns=col)
        else:
            df_add = pd.DataFrame([[float(temp[0]), date, linuxtime, float(linuxtime - pre_linuxtime), float(add_time + (linuxtime - pre_linuxtime))]], columns=col)
            add_time = add_time + (linuxtime - pre_linuxtime)

        pre_linuxtime = linuxtime
        intv = intv + 1
        df = pd.concat([df, df_add])

    with open(compare_file_path) as my_file:
        lines = [line for line in my_file]

    topic = lines[0][7:].replace("\n", "")
    Date_range = lines[1][11:].replace("\n", "")

    df2 = pd.DataFrame(columns=col)
    date_format = "%d %b %Y %H:%M:%S"
    intv = 0
    add_time = 0

    for i in lines[5:]:
        temp = i
        temp = temp.split("|")
        date = temp[1][1:].replace("\n", "")
        date = datetime.strptime(date, date_format)
        linuxtime = time.mktime(date.timetuple())
        temp_var = (temp[0])  # Try converting temp[0] to float
        if not temp_var.strip().replace('.', '', 1).isdigit():
            temp[0] = 0

        if intv == 0:
            df_add = pd.DataFrame(
                [[float(temp[0]), date, linuxtime, 0, 0]], columns=col
            )

        else:
            df_add = pd.DataFrame(
                [
                    [
                        float(temp[0]),
                        date,
                        linuxtime,
                        float(linuxtime - pre_linuxtime),
                        float(add_time + (linuxtime - pre_linuxtime)),
                    ]
                ],
                columns=col,
            )
            add_time = add_time + (linuxtime - pre_linuxtime)

        pre_linuxtime = linuxtime
        intv = intv + 1
        df2 = pd.concat([df2, df_add])

    # Filter requirements.

    filtered_data = butter_lowpass_filter(df["payload"].values, cutoff, fs, order)
    df["filtered_payload"] = filtered_data

    filtered_data2 = butter_lowpass_filter(df2["payload"].values, cutoff, fs, order)
    # df = df.reset_index()
    df2_values = resample(df2["payload"].values, len(df))
    filtered_data2 = resample(filtered_data2, len(filtered_data))

    # DATA COMPARE

    df["comparison"] = df2_values
    df["filtered comparison"] = filtered_data2

    for i in df.columns[3:]:
        df[i] = df[i].astype(float)

    df["topic"] = topic

    # Calculate outlier score
    Q1 = df["payload"].quantile(0.25)
    Q3 = df["payload"].quantile(0.75)
    IQR = Q3 - Q1

    # identify outliers
    threshold = 1.5
    outliers = df[
        (df["payload"] < Q1 - threshold * IQR) | (df["payload"] > Q3 + threshold * IQR)
    ]

    # Scoring outlier, find the max form zero to outlier number
    score_outlier = bs_outlier - len(outliers)
    score_outlier = max(0, score_outlier)
    data["score_3"] = score_outlier

    # Requred input, remaining amount Scoring Estimation, " what is your extortion of water amount in a 5 days?"
    standardinput = standard_input
    input = 50  # how much you left
    if input == 0:
        score_water_bottle = 0
    if input < 20:
        score_water_bottle = bs_water + min(0, standardinput - (220 - input)) / 10 * 5
    if input >= 20:
        score_water_bottle = bs_water - max(0, standardinput - (220 - input)) / 10 * 5

    score_water_bottle = max(0, score_water_bottle)
    data["score_2"] = score_water_bottle

    # Scoring data
    ck_df = df.loc[df["interval"] >= 100]
    score_datacount = (len(ck_df) + 1) / 400
    data["score_1"] = score_datacount

    # Scoring sum, score_outlier + score_water_bottle + score_datacount
    total_score = score_outlier + score_water_bottle + score_datacount
    data["total_score"] = total_score
    data["topic"] = topic
    if radio_var == 1:
        json_string = json.dumps(data, indent=2)  # 'indent' for pretty printing

        # Update the text in the scrolled text widget
    else:
        if radio_var != 3:
            df = df.drop(columns=["filtered comparison"])
        show(df)


root = tk.Tk()


radio_var = 1
standard_input_value = 25

# Create radio buttons


if not radio_var:
    messagebox.showerror("Error", "Please select an option")
elif selected_file_path == None:
    messagebox.showerror("Error", "Please select a file to process")
else:
    standard_input = int(standard_input_value)
    if radio_var != 3:
        compare_file_path = selected_file_path
    process_selected_file()

print(json.dumps(data, indent=2))

