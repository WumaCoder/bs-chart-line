import { Banner, Button, Form, Space, Spin, Toast } from "@douyinfe/semi-ui";
import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./index.module.css";
import { useTranslation } from "next-i18next";
import { BsSdk } from "@/libs/bs-sdk/BsSdk";
import BProvide from "@/libs/bs-sdk/components/b-provide";
import { BsORM } from "@/libs/bs-sdk/BsORM";
import BSelectField from "@/libs/bs-sdk/components/b-select-field";
import Section from "@douyinfe/semi-ui/lib/es/form/section";
import ECharts from "@/components/echarts";
import {
  base64ToFile,
  downloadFile,
  fileToIOpenAttachment,
  useKeepState,
} from "@/libs/bs-sdk/shared";
import { FieldType } from "@lark-base-open/js-sdk";

const bsSdk = new BsSdk({
  onSelectionChange: true,
  immediatelySelectionChange: true,
});

const orm = new BsORM(bsSdk);

export default function Home() {
  const [t, i18n] = useTranslation();
  const [option, setOption] = useState<any>(
    createOption(
      {
        A: 10,
        B: 10,
        C: 10,
      },
      { max: 10, min: 0 }
    )
  );
  const echartRef = useRef();
  const [conf, setConf] = useKeepState<any>({
    output: { type: "preview" },
    chart: { max: 10, min: 0 },
  });

  // console.log(conf);

  useEffect(() => {
    // const clear = bsSdk.selectionChangeEmitter.on(async (e) => {
    //   const { record, field } = await bsSdk.getSelectionQuery(e.data);
    //   console.log("record", record);
    //   console.log("field", field);
    //   console.log(e);
    // });
    // return clear;
    console.log("useEffect");
    bsSdk.bitable.bridge.getLanguage().then((lang) => {
      i18n.changeLanguage(lang.includes("zh") ? "zh" : "en");
    });
  }, []);

  const onSubmit = useCallback(async (conf: any) => {
    console.log(
      conf,
      echartRef
      // downloadFile(base64ToFile(url, Date.now() + ".png", "image/png"))
    );
    if (Object.keys(conf?.select || {}).length === 0)
      return Toast.error(t("toast-select-number-field"));
    let load = Toast.info({
      icon: <Spin />,
      content: `${t("toast-gening")}...`,
      duration: 0,
    });
    let recordId = "";
    if (conf.output.type !== "multiToField") {
      const select = await bsSdk.getSelection();
      console.log({ select });

      if (select.recordId) {
        recordId = select.recordId as string;
      } else {
        if (conf?.output?.type === "preview") {
          recordId = await (await bsSdk.getActiveTable())
            .getRecords({ pageSize: 1 })
            .then((res) => res.records[0].recordId);
        }
      }
    }
    console.log({ recordId });

    if (conf.output.type === "multiToField") {
      const recordIds = await bsSdk.getRecordIds();
      if (!recordIds.length) return Toast.error(t("toast-add-record"));
      for (let i = 0; i < recordIds.length; i++) {
        Toast.close(load);
        load = Toast.info({
          icon: <Spin />,
          content: `${t("toast-gening")}(${i + 1}/${recordIds.length})...`,
          duration: 0,
        });
        const recordId = recordIds[i];
        const url = await gene(recordId);
        if (!url) continue;
        const outfield = orm.getFieldsMap().get(conf.output.field);
        if ((await outfield?.getType()) !== FieldType.Attachment) {
          Toast.close(load);
          return Toast.error(t("toast-select-field"));
        }
        outfield?.setValue(recordId, [
          await fileToIOpenAttachment(
            bsSdk.base,
            base64ToFile(url, Date.now() + ".png", "image/png")
          ),
        ]);
      }
    } else if (conf.output.type === "toField") {
      if (!recordId) {
        Toast.close(load);
        return Toast.error(t("toast-select-record"));
      }

      const url = await gene(recordId);

      const outfield = orm.getFieldsMap().get(conf.output.field);
      if ((await outfield?.getType()) !== FieldType.Attachment) {
        Toast.close(load);
        return Toast.error(t("toast-select-field"));
      }
      outfield?.setValue(recordId, [
        await fileToIOpenAttachment(
          bsSdk.base,
          base64ToFile(url, Date.now() + ".png", "image/png")
        ),
      ]);
    } else {
      if (!recordId) {
        Toast.close(load);
        return Toast.error(t("toast-select-record"));
      }
      await gene(recordId);
    }
    Toast.close(load);
    Toast.success(t("toast-gene-success"));

    async function gene(recordId: string) {
      const record = await orm.getRecord(recordId);
      const selectFieldRecord = conf.select.reduce(
        (map: any, fieldId: string) => {
          let v = toDisplay(record[fieldId]);
          if (!v) {
            v = 0;
          }
          v = Number(v);
          // console.log("select", v, fieldId, record[fieldId]);

          if (typeof v === "number" && v === v) {
            map[orm.getFieldsMap()?.get(fieldId)?.name as string] = v;
          }
          return map;
        },
        {}
      );

      if (Object.keys(selectFieldRecord).length === 0) {
        return;
      }

      setOption(createOption(selectFieldRecord, conf?.chart));
      console.log(record, selectFieldRecord);

      await new Promise((resolve) => setTimeout(resolve, 1));
      const url = (echartRef.current as any)?.getDataURL();
      return url;
    }
  }, []);

  const onChange = useCallback(
    (e: any) => {
      // console.log("onChange", e);

      setConf({
        ...e.values,
        output: Object.assign({}, conf?.output, e.values?.output),
      });
    },
    [conf, setConf]
  );

  return (
    <main className={styles.main}>
      <BProvide
        orm={orm}
        formProps={{
          onSubmit,
          onChange,
          labelPosition: "left",
          initValues: conf,
        }}
        loadingText={t("init")}
      >
        <Section text={t("field-conf")} style={{ marginTop: "10px" }}>
          <BSelectField
            field="select"
            label={t("select-field")}
            placeholder={t("select-field-tip")}
            multiple
          ></BSelectField>
        </Section>
        <Section text={t("chart-conf")} style={{ marginTop: "10px" }}>
          <Form.InputNumber
            field="chart.max"
            label={t("chart-conf-max")}
          ></Form.InputNumber>
          <Form.InputNumber
            field="chart.min"
            label={t("chart-conf-min")}
          ></Form.InputNumber>
        </Section>
        <Section text={t("output-conf")} style={{ marginTop: "10px" }}>
          <Form.Select field="output.type" label={t("output-type")}>
            <Form.Select.Option value={"preview"}>
              {t("priview")}
            </Form.Select.Option>
            <Form.Select.Option value={"toField"}>
              {t("gene-to-field")}
            </Form.Select.Option>
            <Form.Select.Option value={"multiToField"}>
              {t("gene-multi-to-field")}
            </Form.Select.Option>
          </Form.Select>
          {conf?.output && conf?.output?.type !== "preview" && (
            <>
              <BSelectField
                field="output.field"
                filterOption={(field) => field?.type === FieldType.Attachment}
                label={t("output-field")}
                placeholder={t("output-field-tip")}
              ></BSelectField>
              <Banner
                type="danger"
                description={t("output-field-danger")}
                style={{ marginBottom: "10px" }}
              />
            </>
          )}
        </Section>
        <Space>
          <Button htmlType="submit" block type="primary">
            {t("btn-gene")}
          </Button>
          <Button
            block
            onClick={() => open("https://zhuanlan.zhihu.com/p/669107200")}
          >
            {t("btn-help")}
          </Button>
        </Space>
        <div style={{ width: "100%", overflow: "scroll" }}>
          <div style={{ width: "500px", height: "500px" }}>
            <ECharts refInstance={echartRef} option={option}></ECharts>
          </div>
        </div>
      </BProvide>
    </main>
  );
}

function createOption(params: any, opt: any) {
  const keys = Object.keys(params);
  const maxKeyLen = Math.max(...keys.map((key) => key.length));
  return {
    animation: false,
    // title: {
    //   text: "Basic Radar Chart",
    // },
    // legend: {
    //   data: ["Allocated Budget", "Actual Spending"],
    // },
    textStyle: {
      fontSize: 16,
    },
    radar: {
      // shape: 'circle',
      // indicator: [
      //   { name: "Sales" },
      //   { name: "Administration" },
      //   { name: "Information Technology" },
      //   { name: "Customer Support" },
      //   { name: "Development" },
      //   { name: "Marketing" },
      // ],
      indicator: keys.map((key) => ({
        name: key,
        max: opt.max,
        min: opt.min,
        // key.length > 6
        //   ? key.slice(0, 6) + "\n" + key.slice(6, key.length)
        //   : key,
      })),
      axisName: {
        color: "#5470c6",
      },
      center: ["50%", "50%"], // 将雷达图居中显示
      radius: maxKeyLen > 5 ? "50%" : maxKeyLen > 4 ? "60%" : "70%", // 设置雷达图的半径为容器高度的70%
    },
    series: [
      {
        name: "Budget vs spending",
        type: "radar",
        data: [
          {
            value: keys.map((key) => params[key]),
            areaStyle: {
              color: "rgba(66, 139, 212, 0.3)",
            },
            label: {
              show: true,
              position: "inside",
            },
            // name: "Allocated Budget",
          },
          // {
          //   value: [4200, 3000, 20000, 35000, 50000, 18000],
          //   name: "Allocated Budget",
          // },
          // {
          //   value: [5000, 14000, 28000, 26000, 42000, 21000],
          //   name: "Actual Spending",
          // },
        ],
      },
    ],
  };
}

function toDisplay(cell: any) {
  return typeof cell === "object"
    ? cell?.text ??
        cell
          ?.map?.((item: any) => item?.text ?? item?.name)
          .filter((item: any) => item)
          .join(",")
    : cell;
}
