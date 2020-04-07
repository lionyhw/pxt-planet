/**
* Functions to Planet sensor by ELECFREAKS Co.,Ltd.
*/
//% color=#0000ff  icon="\uf06d" block="Planet" blockId="Planet"
namespace Planet {
    let weatherMonitorStarted = false;
    // Keep Track of weather monitoring variables
    //let numRainDumps = 0
    //let numWindTurns = 0
    //let windMPH = 0

    // BME280 Addresses
    let BME280_I2C_ADDR = 0x76
    let dig_T1 = getUInt16LE(0x88)
    let dig_T2 = getInt16LE(0x8A)
    let dig_T3 = getInt16LE(0x8C)
    let dig_P1 = getUInt16LE(0x8E)
    let dig_P2 = getInt16LE(0x90)
    let dig_P3 = getInt16LE(0x92)
    let dig_P4 = getInt16LE(0x94)
    let dig_P5 = getInt16LE(0x96)
    let dig_P6 = getInt16LE(0x98)
    let dig_P7 = getInt16LE(0x9A)
    let dig_P8 = getInt16LE(0x9C)
    let dig_P9 = getInt16LE(0x9E)
    let dig_H1 = getreg(0xA1)
    let dig_H2 = getInt16LE(0xE1)
    let dig_H3 = getreg(0xE3)
    let a = getreg(0xE5)
    let dig_H4 = (getreg(0xE4) << 4) + (a % 16)
    let dig_H5 = (getreg(0xE6) << 4) + (a >> 4)
    let dig_H6 = getInt8LE(0xE7)
    let T = 0
    let P = 0
    let H = 0
    setreg(0xF2, 0x04)
    setreg(0xF4, 0x2F)
    setreg(0xF5, 0x0C)
    setreg(0xF4, 0x2F)

    // Stores compensation values for Temperature (must be read from BME280 NVM)
    let digT1Val = 0
    let digT2Val = 0
    let digT3Val = 0

    // Stores compensation values for humidity (must be read from BME280 NVM)
    let digH1Val = 0
    let digH2Val = 0
    let digH3Val = 0
    let digH4Val = 0
    let digH5Val = 0
    let digH6Val = 0

    // Buffer to hold pressure compensation values to pass to the C++ compensation function
    let digPBuf: Buffer

    // BME Compensation Parameter Addresses for Temperature
    const digT1 = 0x88
    const digT2 = 0x8A
    const digT3 = 0x8C

    // BME Compensation Parameter Addresses for Pressure
    const digP1 = 0x8E
    const digP2 = 0x90
    const digP3 = 0x92
    const digP4 = 0x94
    const digP5 = 0x96
    const digP6 = 0x98
    const digP7 = 0x9A
    const digP8 = 0x9C
    const digP9 = 0x9E

    // BME Compensation Parameter Addresses for Humidity
    const digH1 = 0xA1
    const digH2 = 0xE1
    const digH3 = 0xE3
    const e5Reg = 0xE5
    const e4Reg = 0xE4
    const e6Reg = 0xE6
    const digH6 = 0xE7

    export enum DigitalRJPin {
        //% block="J1 (P1,P8)"
        J1,
        //% block="J2 (P2,P12)"
        J2,
        //% block="J3 (P13,P14)"
        J3,
        //% block="J4 (P15,P16)"
        J4
    }
    export enum AnalogRJPin {
        //% block="J1 (P1,P8)"
        J1,
        //% block="J2 (P2,P12)"
        J2
    }

    export enum Distance_Unit_List {
        //% block="cm" 
        Distance_Unit_cm,

        //% block="inch"
        Distance_Unit_inch,
    }
    export enum ledStateList {
        //% block="On"
        On,

        //% block="Off"
        Off
    }
    export enum ADKeyList {
        //% block="A"
        A,
        //% block="B"
        B,
        //% block="C"
        C,
        //% block="D"
        D,
        //% block="E"
        E
    }
    export enum RelayStateList {
        //% block="NC|Close NO|Open"
        On,

        //% block="NC|Open NO|Close"
        Off
    }
    export enum BME280_state {
        //% block="temperature(℃)" enumval=0
        BME280_temperature_C,

        //% block="humidity(0~100)" enumval=1
        BME280_humidity,

        //% block="pressure(hPa)" enumval=2
        BME280_pressure,

        //% block="altitude(M)" enumval=3
        BME280_altitude,
    }


    function setreg(reg: number, dat: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = dat;
        pins.i2cWriteBuffer(BME280_I2C_ADDR, buf);
    }

    function getreg(reg: number): number {
        pins.i2cWriteNumber(BME280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME280_I2C_ADDR, NumberFormat.UInt8BE);
    }

    function getInt8LE(reg: number): number {
        pins.i2cWriteNumber(BME280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME280_I2C_ADDR, NumberFormat.Int8LE);
    }

    function getUInt16LE(reg: number): number {
        pins.i2cWriteNumber(BME280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME280_I2C_ADDR, NumberFormat.UInt16LE);
    }

    function getInt16LE(reg: number): number {
        pins.i2cWriteNumber(BME280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BME280_I2C_ADDR, NumberFormat.Int16LE);
    }
    function get(): void {
        let adc_T = (getreg(0xFA) << 12) + (getreg(0xFB) << 4) + (getreg(0xFC) >> 4)
        let var1 = (((adc_T >> 3) - (dig_T1 << 1)) * dig_T2) >> 11
        let var2 = (((((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1)) >> 12) * dig_T3) >> 14
        let t = var1 + var2
        T = ((t * 5 + 128) >> 8) / 100
        var1 = (t >> 1) - 64000
        var2 = (((var1 >> 2) * (var1 >> 2)) >> 11) * dig_P6
        var2 = var2 + ((var1 * dig_P5) << 1)
        var2 = (var2 >> 2) + (dig_P4 << 16)
        var1 = (((dig_P3 * ((var1 >> 2) * (var1 >> 2)) >> 13) >> 3) + (((dig_P2) * var1) >> 1)) >> 18
        var1 = ((32768 + var1) * dig_P1) >> 15
        if (var1 == 0)
            return; // avoid exception caused by division by zero
        let adc_P = (getreg(0xF7) << 12) + (getreg(0xF8) << 4) + (getreg(0xF9) >> 4)
        let _p = ((1048576 - adc_P) - (var2 >> 12)) * 3125
        _p = (_p / var1) * 2;
        var1 = (dig_P9 * (((_p >> 3) * (_p >> 3)) >> 13)) >> 12
        var2 = (((_p >> 2)) * dig_P8) >> 13
        P = _p + ((var1 + var2 + dig_P7) >> 4)
        let adc_H = (getreg(0xFD) << 8) + getreg(0xFE)
        var1 = t - 76800
        var2 = (((adc_H << 14) - (dig_H4 << 20) - (dig_H5 * var1)) + 16384) >> 15
        var1 = var2 * (((((((var1 * dig_H6) >> 10) * (((var1 * dig_H3) >> 11) + 32768)) >> 10) + 2097152) * dig_H2 + 8192) >> 14)
        var2 = var1 - (((((var1 >> 15) * (var1 >> 15)) >> 7) * dig_H1) >> 4)
        if (var2 < 0) var2 = 0
        if (var2 > 419430400) var2 = 419430400
        H = (var2 >> 12) / 1024
    }

    /**********sensor************************星宿传感器************************************************ */
    /**
    * get Ultrasonic distance
    */
    //% blockId=sonarbit block="at pin %Rjpin Ultrasonic distance in unit %distance_unit "
    //% weight=1
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% distance_unit.fieldEditor="gridpicker"
    //% distance_unit.fieldOptions.columns=2
    //% subcategory=Sensor
    export function Ultrasoundsensor(Rjpin: DigitalRJPin, distance_unit: Distance_Unit_List): number {
        let pin = DigitalPin.P1
        switch (Rjpin) {
            case DigitalRJPin.J1:
                pin = DigitalPin.P1
                break;
            case DigitalRJPin.J2:
                pin = DigitalPin.P2
                break;
            case DigitalRJPin.J3:
                pin = DigitalPin.P13
                break;
            case DigitalRJPin.J4:
                pin = DigitalPin.P15
                break;
        }
        pins.setPull(pin, PinPullMode.PullNone)
        pins.digitalWritePin(pin, 0)
        control.waitMicros(2)
        pins.digitalWritePin(pin, 1)
        control.waitMicros(10)
        pins.digitalWritePin(pin, 0)

        // read pulse
        let d = pins.pulseIn(pin, PulseValue.High, 25000)
        let distance = d * 9 / 6 / 58

        if (distance > 400) {
            distance = 0
        }
        switch (distance_unit) {
            case Distance_Unit_List.Distance_Unit_cm:
                return Math.floor(distance)  //cm
                break
            case Distance_Unit_List.Distance_Unit_inch:
                return Math.floor(distance / 254)   //inch
                break
            default:
                return 0
        }
    }
    /** 
    * TODO: get noise(dB)
    * @param noisepin describe parameter here, eg: AnalogRJPin.J1
    */
    //% blockId="readnoise" block="at pin %Rjpin Noise sensor volume(dB)"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Sensor
    //% weight=5
    export function NoiseSensor(Rjpin: AnalogRJPin): number {
        let pin = AnalogPin.P1
        switch (Rjpin) {
            case AnalogRJPin.J1:
                pin = AnalogPin.P1
                break;
            case AnalogRJPin.J2:
                pin = AnalogPin.P2
                break;
        }
        let level = 0, voltage = 0, noise = 0, h = 0, l = 0, sumh = 0, suml = 0
        for (let i = 0; i < 1000; i++) {
            level = level + pins.analogReadPin(pin)
        }
        level = level / 1000
        for (let i = 0; i < 1000; i++) {
            voltage = pins.analogReadPin(pin)
            if (voltage >= level) {
                h += 1
                sumh = sumh + voltage
            } else {
                l += 1
                suml = suml + voltage
            }
        }
        if (h == 0) {
            sumh = level
        } else {
            sumh = sumh / h
        }
        if (l == 0) {
            suml = level
        } else {
            suml = suml / l
        }
        noise = sumh - suml
        if (noise <= 4) {
            noise = pins.map(
                noise,
                0,
                4,
                30,
                50
            )
        } else if (noise <= 8) {
            noise = pins.map(
                noise,
                4,
                8,
                50,
                55
            )
        } else if (noise <= 14) {
            noise = pins.map(
                noise,
                9,
                14,
                55,
                60
            )
        } else if (noise <= 32) {
            noise = pins.map(
                noise,
                15,
                32,
                60,
                70
            )
        } else if (noise <= 60) {
            noise = pins.map(
                noise,
                33,
                60,
                70,
                75
            )
        } else if (noise <= 100) {
            noise = pins.map(
                noise,
                61,
                100,
                75,
                80
            )
        } else if (noise <= 150) {
            noise = pins.map(
                noise,
                101,
                150,
                80,
                85
            )
        } else if (noise <= 231) {
            noise = pins.map(
                noise,
                151,
                231,
                85,
                90
            )
        } else {
            noise = pins.map(
                noise,
                231,
                1023,
                90,
                120
            )
        }
        noise = Math.round(noise)
        return Math.round(noise)
    }
    /**
    * TODO: get light intensity(0~100%)
    * @param lightintensitypin describe parameter here, eg: AnalogRJPin.J1
    */
    //% blockId="LightSensor" block="at pin %Rjpin light intensity(0~100)"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Sensor weight=10
    export function LightSensor(Rjpin: AnalogRJPin): number {
        let pin = AnalogPin.P1
        switch (Rjpin) {
            case AnalogRJPin.J1:
                pin = AnalogPin.P1
                break;
            case AnalogRJPin.J2:
                pin = AnalogPin.P2
                break;
        }
        let voltage = 0, lightintensity = 0;
        voltage = pins.map(
            pins.analogReadPin(pin),
            0,
            1023,
            0,
            100
        );
        lightintensity = voltage;
        return Math.round(lightintensity);
    }
    /**
    * TODO: get soil moisture(0~100%)
    * @param soilmoisturepin describe parameter here, eg: AnalogRJPin.J1
    */
    //% blockId="readsoilmoisture" block="at pin %Rjpin Soil moisture(0~100)"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Sensor weight=15
    export function SoilHumidity(Rjpin: AnalogRJPin): number {
        let voltage = 0, soilmoisture = 0;
        let pin = AnalogPin.P1
        switch (Rjpin) {
            case AnalogRJPin.J1:
                pin = AnalogPin.P1
                break;
            case AnalogRJPin.J2:
                pin = AnalogPin.P2
                break;
        }
        voltage = pins.map(
            pins.analogReadPin(pin),
            0,
            1023,
            0,
            100
        );
        soilmoisture = voltage;
        return Math.round(soilmoisture);
    }
    /**
    * TODO: Detect soil moisture value(0~100%)
    * @param soilmoisturepin describe parameter here, eg: DigitalRJPin.J1
    */
    //% blockId="PIR" block="at pin %Rjpin PIR detects motion"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Sensor weight=20
    export function PIR(Rjpin: DigitalRJPin): boolean {
        let pin = DigitalPin.P1
        switch (Rjpin) {
            case DigitalRJPin.J1:
                pin = DigitalPin.P1
                break;
            case DigitalRJPin.J2:
                pin = DigitalPin.P2
                break;
            case DigitalRJPin.J3:
                pin = DigitalPin.P13
                break;
            case DigitalRJPin.J4:
                pin = DigitalPin.P15
                break;
        }
        if (pins.digitalReadPin(pin) == 1) {
            return true
        }
        else {
            return false
        }
    }
    /**
    * get water level value (0~100)
    * @param waterlevelpin describe parameter here, eg: AnalogRJPin.J1
    */
    //% blockId="readWaterLevel" block="at pin %Rjpin water level(0~100)"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Sensor weight=25
    export function WaterLevel(Rjpin: AnalogRJPin): number {
        let pin = AnalogPin.P1
        switch (Rjpin) {
            case AnalogRJPin.J1:
                pin = AnalogPin.P1
                break;
            case AnalogRJPin.J2:
                pin = AnalogPin.P2
                break;
        }
        let voltage = 0, waterlevel = 0;
        voltage = pins.map(
            pins.analogReadPin(pin),
            0,
            700,
            0,
            100
        );
        waterlevel = voltage;
        return Math.round(waterlevel)
    }
    /**
     * get dust value (μg/m³) 
    * @param vLED describe parameter here, eg: DigitalPin.P16
     * @param vo describe parameter here, eg: AnalogPin.P1
    */
    //% blockId="readdust" block="at pin %Rjpin value of dust(μg/m³) "
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Sensor weight=30
    export function Dust(Rjpin: AnalogRJPin): number {
        let vLED: DigitalPin, vo: AnalogPin
        switch (Rjpin) {
            case AnalogRJPin.J1:
                vLED = DigitalPin.P8
                vo = AnalogPin.P1
                break;
            case AnalogRJPin.J2:
                vLED = DigitalPin.P12
                vo = AnalogPin.P2
                break;
        }
        let voltage = 0, dust = 0;
        pins.digitalWritePin(vLED, 0);
        control.waitMicros(160);
        voltage = pins.analogReadPin(vo);
        control.waitMicros(100);
        pins.digitalWritePin(vLED, 1);
        voltage = pins.map(
            voltage,
            0,
            1023,
            0,
            3100 / 2 * 3
        );
        dust = (voltage - 380) * 5 / 29;
        if (dust < 0) {
            dust = 0
        }
        return Math.round(dust)
    }

    //% block="at pin IIC BME280 %state value"
    //% subcategory=Sensor weight=35
    export function octopus_BME280(state: BME280_state): number {
        switch (state) {
            case 0:
                get();
                return Math.round(T);
                break;
            case 1:
                get();
                return Math.round(H);
                break;
            case 2:
                get();
                return Math.round(P / 100);
                break;
            case 3:
                get();
                return Math.round(1015 - (P / 100)) * 9
                break;
            default:
                return 0
        }
        return 0;
    }
    //% shim=DS18B20::Temperature
    export function Temperature_read(p: number): number {
        // Fake function for simulator
        return 0
    }

    //% block="at pin %Rjpin ds18b20 Temperature(℃)value"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Sensor weight=42
    export function Temperature18b20(Rjpin: DigitalRJPin): number {
        // Fake function for simulator
        let temp: number = 0;
        switch (Rjpin) {
            case DigitalRJPin.J1:
                temp = Temperature_read(1)
                break;
            case DigitalRJPin.J2:
                temp = Temperature_read(2)
                break;
            case DigitalRJPin.J3:
                temp = Temperature_read(13)
                break;
            case DigitalRJPin.J4:
                temp = Temperature_read(15)
                break;
        }
        temp = temp / 100
        return temp
    }


    /**Input sensor*******************星宿传感器************************************* */


    /**
    * check crash
    */
    //% blockId=Crash block="at pin %Rjpin Crash Sensor is pressed"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Input
    export function Crash(Rjpin: DigitalRJPin): boolean {
        let pin = DigitalPin.P1
        switch (Rjpin) {
            case DigitalRJPin.J1:
                pin = DigitalPin.P1
                break;
            case DigitalRJPin.J2:
                pin = DigitalPin.P2
                break;
            case DigitalRJPin.J3:
                pin = DigitalPin.P13
                break;
            case DigitalRJPin.J4:
                pin = DigitalPin.P15
                break;
        }
        if (pins.digitalReadPin(pin) == 1) {
            return true
        }
        else {
            return false
        }
    }

    //% blockId="potentiometer" block="at pin %Rjpin potentiometer value"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% subcategory=Input
    export function potentiometer(Rjpin: DigitalRJPin): number {
        let pin = AnalogPin.P1
        switch (Rjpin) {
            case DigitalRJPin.J1:
                pin = AnalogPin.P1
                break;
            case DigitalRJPin.J2:
                pin = AnalogPin.P2
                break;
            case DigitalRJPin.J3:
                pin = AnalogPin.P13
                break;
            case DigitalRJPin.J4:
                pin = AnalogPin.P15
                break;
        }
        return pins.analogReadPin(pin)
    }

    //% block="at pin %Rjpin ADKeyboard key %key is pressed"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% key.fieldEditor="gridpicker"
    //% key.fieldOptions.columns=2
    //% subcategory=Input
    export function ADKeyboard(Rjpin: DigitalRJPin, key: ADKeyList): boolean {
        let pin = AnalogPin.P1
        switch (Rjpin) {
            case DigitalRJPin.J1:
                pin = AnalogPin.P1
                break;
            case DigitalRJPin.J2:
                pin = AnalogPin.P2
                break;
            case DigitalRJPin.J3:
                pin = AnalogPin.P13
                break;
            case DigitalRJPin.J4:
                pin = AnalogPin.P15
                break;
        }
        let Analog_number: number = pins.analogReadPin(pin);
        switch (key) {
            case ADKeyList.A:
                if (Analog_number < 10) {
                    return true;
                }
                else {
                    return false
                }
                break;
            case ADKeyList.B:
                if (Analog_number >= 40 && Analog_number <= 60) {
                    return true;
                }
                else {
                    return false
                }
                break;
            case ADKeyList.C:
                if (Analog_number >= 80 && Analog_number <= 110) {
                    return true;
                }
                else {
                    return false
                }
                break;
            case ADKeyList.D:
                if (Analog_number >= 130 && Analog_number <= 150) {
                    return true;
                }
                else {
                    return false
                }
                break;
            case ADKeyList.E:
                if (Analog_number >= 530 && Analog_number <= 560) {
                    return true;
                }
                else {
                    return false
                }
                break;

        }
    }

    /**Output sensor*******************星宿传感器************************************* */

    /**
    * toggle led
    */
    //% blockId=LED block="at pin %Rjpin LED toggle to %ledstate"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% ledstate.fieldEditor="gridpicker"
    //% ledstate.fieldOptions.columns=2
    //% subcategory=Output
    export function LED(Rjpin: DigitalRJPin, ledstate: ledStateList): void {
        let pin = DigitalPin.P1
        switch (Rjpin) {
            case DigitalRJPin.J1:
                pin = DigitalPin.P1
                break;
            case DigitalRJPin.J2:
                pin = DigitalPin.P2
                break;
            case DigitalRJPin.J3:
                pin = DigitalPin.P13
                break;
            case DigitalRJPin.J4:
                pin = DigitalPin.P15
                break;
        }
        switch (ledstate) {
            case ledStateList.On:
                pins.digitalWritePin(pin, 1)
                break;
            case ledStateList.Off:
                pins.digitalWritePin(pin, 0)
                break;
        }
    }
    /**
    * toggle Relay
    */
    //% blockId=Relay block="at pin %Rjpin Relay toggle to %Relaystate"
    //% Rjpin.fieldEditor="gridpicker"
    //% Rjpin.fieldOptions.columns=2
    //% Relaystate.fieldEditor="gridpicker"
    //% Relaystate.fieldOptions.columns=2
    //% subcategory=Output
    export function Relay(Rjpin: DigitalRJPin, Relaystate: RelayStateList): void {
        let pin = DigitalPin.P1
        switch (Rjpin) {
            case DigitalRJPin.J1:
                pin = DigitalPin.P1
                break;
            case DigitalRJPin.J2:
                pin = DigitalPin.P2
                break;
            case DigitalRJPin.J3:
                pin = DigitalPin.P13
                break;
            case DigitalRJPin.J4:
                pin = DigitalPin.P15
                break;
        }
        switch (Relaystate) {
            case RelayStateList.On:
                pins.digitalWritePin(pin, 0)
                break;
            case RelayStateList.Off:
                pins.digitalWritePin(pin, 1)
                break;
        }
    }

}
