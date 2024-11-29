<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import { useSDK } from "@/plugins/sdk";
import { ref, onMounted, computed } from "vue";
import { useClientService } from "@/services/InteractshService";
import { QuickSSRFBtn, QuickSSRFBtnCount } from "@/index";
import { v4 as uuidv4 } from "uuid";
import { useClipboard } from "@vueuse/core";

const sdk = useSDK();
const responseEditorRef = ref();
const requestEditorRef = ref();
const request = ref();
const response = ref();
const clipboard = useClipboard();
let clientService: any = null;

// Reactive data source
const sourceData = ref<Response[]>([]);

const parseDnsResponse = (json: any): Response => {
  return {
    protocol: json.protocol,
    uniqueId: json["unique-id"],
    fullId: json["full-id"],
    qType: json["q-type"],
    rawRequest: json["raw-request"],
    rawResponse: json["raw-response"],
    remoteAddress: json["remote-address"],
    timestamp: json.timestamp,
  };
};

const addToSourceData = (response: Response) => {
  QuickSSRFBtnCount.value += 1;
  QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
  sourceData.value.push(response);
};

const tableData = computed(() =>
  sourceData.value.map((item, index) => ({
    req: index + 1,
    dateTime: new Date(item.timestamp).toISOString(),
    type: item.protocol.toUpperCase(),
    payload: item.fullId,
    source: item.remoteAddress,
  }))
);

const selectedRow = ref<Response | null>(null);

const onRowClick = (event: { data: { req: number } }) => {
  QuickSSRFBtnCount.value = 0;
  QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);
  const selectedIndex = event.data.req - 1;
  selectedRow.value = sourceData.value[selectedIndex];
  onSelectedData(selectedRow.value);
};

const onSelectedData = (selectedData: Response | null) => {
  if (!selectedData) return;

  try {
    responseEditorRef.value?.getEditorView().dispatch({
      changes: {
        from: 0,
        to: responseEditorRef.value.getEditorView().state.doc.length,
        insert: selectedData.rawResponse || '',
      },
    });

    requestEditorRef.value?.getEditorView().dispatch({
      changes: {
        from: 0,
        to: requestEditorRef.value.getEditorView().state.doc.length,
        insert: selectedData.rawRequest || '',
      },
    });
  } catch (error) {
    console.error('Error updating editors:', error);
    sdk.window.showToast("Failed to update editors", { variant: "error" });
  }
};

const onGenerateClick = async () => {
  try {
    if (clientService === null) {
      clientService = useClientService();

      await clientService.start(
        {
          serverURL: "https://oast.site",
          token: uuidv4(),
          keepAliveInterval: 30000,
        },
        async (interaction: any) => {
          try {
            console.log("Received interaction:", interaction);
            const resp: Response = parseDnsResponse(interaction);
            addToSourceData(resp);
          } catch (error) {
            console.error('Error processing interaction:', error);
          }
        }
      );

      const url = clientService.generateUrl();
      console.log('Generated URL:', url);

      // Ensure URL has protocol
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      await clipboard.copy(fullUrl);
      sdk.window.showToast("URL copied to clipboard", { variant: "success" });
    } else {
      const url = clientService.generateUrl();
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      await clipboard.copy(fullUrl);
      sdk.window.showToast("URL copied to clipboard", { variant: "success" });
    }
  } catch (error) {
    console.error('Error generating link:', error);
    sdk.window.showToast("Failed to generate link", { variant: "error" });
  }
};

const onManualPooling = async () => {
  try {
    if (!clientService) {
      sdk.window.showToast("Client service not initialized", { variant: "error" });
      return;
    }
    await clientService.poll();
  } catch (error) {
    console.error('Polling error:', error);
    sdk.window.showToast("Polling failed", { variant: "error" });
  }
};

const onClearData = async () => {
  try {
    sourceData.value = [];
    QuickSSRFBtnCount.value = 0;
    QuickSSRFBtn.setCount(QuickSSRFBtnCount.value);

    responseEditorRef.value?.getEditorView().dispatch({
      changes: {
        from: 0,
        to: responseEditorRef.value.getEditorView().state.doc.length,
        insert: '',
      },
    });

    requestEditorRef.value?.getEditorView().dispatch({
      changes: {
        from: 0,
        to: requestEditorRef.value.getEditorView().state.doc.length,
        insert: '',
      },
    });

    sdk.window.showToast("Data cleared", { variant: "success" });
  } catch (error) {
    console.error('Error clearing data:', error);
    sdk.window.showToast("Failed to clear data", { variant: "error" });
  }
};

onMounted(() => {
  try {
    const responseEditor = sdk.ui.httpResponseEditor();
    const requestEditor = sdk.ui.httpRequestEditor();

    response.value?.appendChild(responseEditor.getElement());
    request.value?.appendChild(requestEditor.getElement());

    responseEditorRef.value = responseEditor;
    requestEditorRef.value = requestEditor;
  } catch (error) {
    console.error('Error mounting editors:', error);
    sdk.window.showToast("Failed to initialize editors", { variant: "error" });
  }
});
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="w-full flex-1">
      <Card class="h-full flex flex-col">
        <template #header>
          <div class="content-center mb-4">
            <h3 class="text-2xl font-semibold" style="margin-left: 20px;">QuickSSRF</h3>
          </div>
        </template>
        <template #content>
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-4 mb-4">
              <h2 class="text-lg font-semibold">Actions</h2>
              <Button label="Generate Link" style="width: 200px" @click="onGenerateClick" />
              <Button label="Polling" style="width: 200px" @click="onManualPooling" />
              <Button label="Clear Data" style="width: 200px" @click="onClearData" />
            </div>
            <div class="flex-1 overflow-auto max-h-[300px]">
              <h3 class="text-lg font-semibold mb-2">Request Logs</h3>
              <DataTable
                :value="tableData"
                v-model:selection="selectedRow"
                selectionMode="single"
                dataKey="req"
                scrollable
                scrollHeight="100%"
                class="w-full"
                @row-click="onRowClick"
              >
                <Column field="req" header="Req #" sortable />
                <Column field="dateTime" header="Date-Time" sortable />
                <Column field="type" header="Type" sortable />
                <Column field="payload" header="Payload" sortable />
                <Column field="source" header="Source" sortable />
              </DataTable>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="w-full flex flex-1 gap-4">
      <div class="h-full w-1/2" ref="request"></div>
      <div class="h-full w-1/2" ref="response"></div>
    </div>
  </div>
</template>
