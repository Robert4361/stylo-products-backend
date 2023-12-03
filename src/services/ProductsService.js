const axios = require("axios");
const commerceToolsApi = require("../utils/CommerceToolsApiClient");
const URL_GET_PRODUCTS = `${commerceToolsApi.apiURLBase}/${commerceToolsApi.projectKey}/products`;
const URL_GET_PRODUCT_TYPE = `${commerceToolsApi.apiURLBase}/${commerceToolsApi.projectKey}/product-types`;
const URL_GET_CATEGORY = `${commerceToolsApi.apiURLBase}/${commerceToolsApi.projectKey}/categories`;
const URL_GET_PRODUCT = `${commerceToolsApi.apiURLBase}/${commerceToolsApi.projectKey}/product-projections/search`;
const URL_GET_PRODUCTS_FILTER = `${commerceToolsApi.apiURLBase}/${commerceToolsApi.projectKey}/product-projections`;

let offset = 0;

async function getAllProducts(limit) {
  if (!limit) limit = 20;
  try {
    const bearerToken = await commerceToolsApi.getAccessToken();
    const response = await axios.get(URL_GET_PRODUCTS, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      params: {
        limit: limit,
        offset: offset,
      },
    });

    let products = response.data.results;
    if (products.length === 0) {
      offset = 0;
      const bearerToken = await commerceToolsApi.getAccessToken();
      const secondResponse = await axios.get(URL_GET_PRODUCTS, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        params: {
          limit: limit,
          offset: offset,
        },
      });
      products = secondResponse.data.results;
      offset += limit;
    } else {
      offset += limit;
    }

    return products;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function getCategoryIdByName(categoryName) {
  try {
    const bearerToken = await commerceToolsApi.getAccessToken();
    const response = await axios.get(URL_GET_CATEGORY, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    let categoryId = null;
    response.data.results.map((category) => {
      if (category.name["en-US"].toLowerCase() === categoryName.toLowerCase()) {
        categoryId = category.id;
      }
    });
    return categoryId;
  } catch (err) {
    console.error(err);
  }
}

async function getFilteredProductList(category, size, color) {
  try {
    const bearerToken = await commerceToolsApi.getAccessToken();
    let queryParams = {
      where: "",
    };

    if (category) {
      const categoryId = await getCategoryIdByName(category);
      if (categoryId != null) {
        queryParams.where += `(categories(id="${categoryId}"))`;
        usedCategoryFilter = true;
      }
    }

    if (size) {
      queryParams.where += `${
        queryParams.where.length > 0 ? " and " : ""
      }(masterVariant(attributes(name="Size" and value=${size})) or variants(attributes(name="Size" and value=${size})))`;
      usedSizeFilter = true;
    }

    if (color) {
      color = color.charAt(0).toUpperCase() + color.slice(1);
      queryParams.where += `${
        queryParams.where.length > 0 ? " and " : ""
      }(masterVariant(attributes(name="Color" and value="${color}")) or variants(attributes(name="Color" and value="${color}")))`;
      usedColorFilter = true;
    }

    if (queryParams.where.length == 0) {
      queryParams.where = "1";
    }

    const response = await axios.get(URL_GET_PRODUCTS_FILTER, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      params: queryParams,
    });

    let sortedResponse = [];
    response.data.results.map((product) => {
      let id = product.id;
      let manufacturer = product.name["en-US"].split(" ")[0];
      let productModel = product.name["en-US"].split(" ").splice(1).join(" ");
      let productPrice = product.masterVariant.prices[0].value.centAmount / 100;
      let images = product.variants.map((v) =>
        v.images.map((image) => {
          return image.url;
        })
      );

      let isAvailable = false;
      for (const variant of product.variants) {
        if (variant.availability.availableQuantity > 0) {
          isAvailable = true;
          break;
        }
      }

      const sortedProduct = {
        id: id,
        manufacturer: manufacturer,
        model: productModel,
        price: productPrice,
        available: isAvailable,
        images: images,
      };
      sortedResponse.push(sortedProduct);
    });
    return sortedResponse;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function getProductById(id) {
  const bearerToken = await commerceToolsApi.getAccessToken();
  try {
    const response = await axios.get(URL_GET_PRODUCTS, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      params: {
        where: `id="${id}"`,
      },
    });
    return response.data.results || [];
  } catch (err) {
    console.error(err);
  }
}

async function getProductType(id) {
  const bearerToken = await commerceToolsApi.getAccessToken();
  try {
    const response = await axios.get(URL_GET_PRODUCT_TYPE, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      params: {
        where: `id="${id}"`,
      },
    });
    return response.data.results[0].name;
  } catch (err) {
    console.error(err);
    return "Couldn't retrieve type";
  }
}

async function getCategoryById(id) {
  const bearerToken = await commerceToolsApi.getAccessToken();
  try {
    const response = await axios.get(URL_GET_CATEGORY, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      params: {
        where: `id="${id}"`,
      },
    });
    return response.data.results[0].name["en-US"];
  } catch (err) {
    console.error(err);
    return "Couldn't retrieve category";
  }
}

async function getProductForHomepage(id) {
  try {
    const bearerToken = await commerceToolsApi.getAccessToken();
    const response = await axios.get(
      URL_GET_PRODUCT + `?filter=variants.sku:"${id}"`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      }
    );
    let shoe = response.data.results[0];
    return {
      name: shoe.name["en-US"],
      available: shoe.masterVariant.availability.isOnStock,
      price: shoe.masterVariant.prices[0].value.centAmount / 100,
      image: shoe.masterVariant.images[0].url,
    };
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  getProductType,
  getCategoryById,
  getProductForHomepage,
  getFilteredProductList,
};
